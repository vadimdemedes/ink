import process from 'node:process';
import createReconciler, {
	type HostConfig as ReconcilerHostConfig,
	type ReactContext,
} from 'react-reconciler';
import {
	DefaultEventPriority,
	NoEventPriority,
} from 'react-reconciler/constants.js';
import {createContext, version as reactVersion} from 'react';
import {
	createTextNode,
	appendChildNode,
	insertBeforeNode,
	removeChildNode,
	freeYogaSubtree,
	emitLayoutListeners,
	setTransform,
	setStyle,
	setTextNodeValue,
	setNodeHidden,
	createNode,
	setAttribute,
	type DOMNodeAttribute,
	type TextNode,
	type ElementNames,
	type DOMElement,
} from './dom.js';
import applyStyles, {type Styles} from './styles.js';
import {type OutputTransformer} from './render-node-to-output.js';

// We need to conditionally perform devtools connection to avoid
// accidentally breaking other third-party code.
// See https://github.com/vadimdemedes/ink/issues/384
// See https://github.com/vadimdemedes/ink/issues/648
if (process.env['DEV'] === 'true') {
	// Intentionally no warning when the package is missing.
	// DEV may be set for other reasons; devtools is opt-in via installing the package.
	let isDevtoolsInstalled = false;
	try {
		import.meta.resolve('react-devtools-core');
		isDevtoolsInstalled = true;
	} catch {}

	if (isDevtoolsInstalled) {
		await import('./devtools.js');
	}
}

type AnyObject = Record<string, unknown>;

const diff = (
	before: AnyObject | undefined,
	after: AnyObject | undefined,
): AnyObject | undefined => {
	if (before === after) {
		return;
	}

	if (!before) {
		return after;
	}

	const changed: AnyObject = {};
	let hasChanges = false;

	for (const key of Object.keys(before)) {
		const isDeleted = after ? !Object.hasOwn(after, key) : true;

		if (!isDeleted) {
			continue;
		}

		changed[key] = undefined;
		hasChanges = true;
	}

	if (after) {
		for (const [key, value] of Object.entries(after)) {
			if (value === before[key]) {
				continue;
			}

			changed[key] = value;
			hasChanges = true;
		}
	}

	return hasChanges ? changed : undefined;
};

const findRootNode = (node: DOMElement): DOMElement | undefined => {
	let current: DOMElement | undefined = node;

	while (current) {
		if (current.nodeName === 'ink-root') {
			return current;
		}

		current = current.parentNode;
	}

	return undefined;
};

/**
Clear the root's cached `staticNode` when the node it points at is being removed as part of a larger subtree.

The previous identity check (`staticNode === removeNode`) only caught direct removal of the `<Static>` element. When an *ancestor* of `<Static>` is removed, the stale `staticNode` reference survives and the next render would replay stale static output (and, before `freeYogaSubtree`, trap on freed WASM memory, see QwenLM/qwen-code#6820).

The owning root is derived from the host parent passed to the removal hook, not a module-level global, so instances with separate stdout streams don't clobber each other's pointers.
*/
const clearStaticNodeIfContained = (
	rootNode: DOMElement | undefined,
	removedNode: DOMElement | TextNode,
): void => {
	if (!rootNode?.staticNode) {
		return;
	}

	// Walk up from staticNode to see if removedNode is an ancestor.
	let current: DOMElement | undefined = rootNode.staticNode;

	while (current) {
		if (current === removedNode) {
			// Only clear staticNode, not previousStaticNode. The inequality
			// (undefined !== previousStaticNode) triggers onStaticChange in
			// resetAfterCommit, which resets the accumulated static output.
			rootNode.staticNode = undefined;
			return;
		}

		current = current.parentNode;
	}
};

const findStaticNode = (node: DOMElement): DOMElement | undefined => {
	if (node.internal_static) {
		return node;
	}

	for (const child of node.childNodes) {
		if (child.nodeName === '#text') {
			continue;
		}

		const staticNode = findStaticNode(child);
		if (staticNode) {
			return staticNode;
		}
	}

	return undefined;
};

type Props = Record<string, unknown>;

type HostContext = {
	isInsideText: boolean;
};

let currentUpdatePriority = NoEventPriority;

async function loadPackageJson() {
	const fs = await import('node:fs');
	const content = fs.readFileSync(
		new URL('../package.json', import.meta.url),
		'utf8',
	);

	const parsedContent = JSON.parse(content) as
		| {
				name?: string;
				version?: string;
		  }
		| undefined;

	return {
		name: parsedContent?.name,
		version: parsedContent?.version,
	};
}

let packageInfo = {
	name: 'ink',
	version: reactVersion,
};

if (process.env['DEV'] === 'true') {
	try {
		const loaded = await loadPackageJson();
		packageInfo = {
			name:
				loaded.name === undefined || loaded.name === ''
					? packageInfo.name
					: loaded.name,
			version:
				loaded.version === undefined || loaded.version === ''
					? packageInfo.version
					: loaded.version,
		};
	} catch (error) {
		console.warn(
			'Failed to load package.json in development mode. Falling back to default renderer metadata.',
			error,
		);
	}
}

type HostConfig = ReconcilerHostConfig<
	ElementNames,
	Props,
	DOMElement,
	DOMElement,
	TextNode,
	unknown,
	DOMElement,
	unknown,
	unknown,
	unknown,
	HostContext,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown
> & {
	// React 19.3 adds fragment refs before the DefinitelyTyped host config exposes them.
	// eslint-disable-next-line @typescript-eslint/no-restricted-types -- React uses null for unsupported fragment refs.
	createFragmentInstance: () => null;
};

// eslint-disable-next-line @eslint-react/naming-convention-context-name -- This is the React reconciler host config, not a React context.
const hostConfig: HostConfig = {
	getRootHostContext: () => ({
		isInsideText: false,
	}),
	prepareForCommit: () => null,
	preparePortalMount: () => null,
	clearContainer: () => false,
	resetAfterCommit(rootNode) {
		// Save the <Static> reference from the committed tree so rendering can access it directly. createInstance also runs for abandoned transitions and must not replace the committed reference.
		const staticNode = findStaticNode(rootNode);
		rootNode.staticNode = staticNode;
		if (staticNode !== rootNode.previousStaticNode) {
			rootNode.isStaticDirty = true;
		}

		if (typeof rootNode.onComputeLayout === 'function') {
			rootNode.onComputeLayout();
		}

		emitLayoutListeners(rootNode);

		/*
		Fire `onStaticChange` BEFORE `onImmediateRender` so ink resets accumulated static output before the new instance emits. Without this, items from a replaced/removed <Static> stay in `fullStaticOutput` (debug mode) and `hasRenderedStaticOutput` stays set, skipping the final unmount render for the new instance.
		*/
		if (rootNode.staticNode !== rootNode.previousStaticNode) {
			rootNode.previousStaticNode = rootNode.staticNode;
			if (typeof rootNode.onStaticChange === 'function') {
				rootNode.onStaticChange();
			}
		}

		// Since renders are throttled at the instance level and <Static> component children
		// are rendered only once and then get deleted, we need an escape hatch to
		// trigger an immediate render to ensure <Static> children are written to output before they get erased
		if (rootNode.isStaticDirty) {
			rootNode.isStaticDirty = false;
			if (typeof rootNode.onImmediateRender === 'function') {
				rootNode.onImmediateRender();
			}

			return;
		}

		if (typeof rootNode.onRender === 'function') {
			rootNode.onRender();
		}
	},
	getChildHostContext(parentHostContext, type) {
		const wasInsideText = parentHostContext.isInsideText;
		const isInsideText = type === 'ink-text' || type === 'ink-virtual-text';

		return wasInsideText === isInsideText ? parentHostContext : {isInsideText};
	},
	shouldSetTextContent: () => false,
	createInstance(originalType, newProps, _rootNode, hostContext) {
		if (originalType === 'ink-box' && hostContext.isInsideText) {
			throw new Error('<Box> can’t be nested inside <Text> component');
		}

		const type =
			originalType === 'ink-text' && hostContext.isInsideText
				? 'ink-virtual-text'
				: originalType;

		const node = createNode(type);

		for (const [key, value] of Object.entries(newProps)) {
			if (key === 'children') {
				continue;
			}

			if (key === 'style') {
				setStyle(node, value as Styles);

				if (node.yogaNode) {
					applyStyles(node.yogaNode, value as Styles);
				}

				continue;
			}

			if (key === 'internal_transform') {
				node.internal_transform = value as OutputTransformer;
				continue;
			}

			if (key === 'internal_static') {
				node.internal_static = true;
				continue;
			}

			setAttribute(node, key, value as DOMNodeAttribute);
		}

		return node;
	},
	createTextInstance(text, _root, hostContext) {
		if (!hostContext.isInsideText) {
			throw new Error(
				`Text string "${text}" must be rendered inside <Text> component`,
			);
		}

		return createTextNode(text);
	},
	resetTextContent() {},
	hideTextInstance(node) {
		setTextNodeValue(node, '');
	},
	unhideTextInstance(node, text) {
		setTextNodeValue(node, text);
	},
	getPublicInstance: instance => instance,
	hideInstance(node) {
		setNodeHidden(node, true);
	},
	unhideInstance(node) {
		setNodeHidden(node, false);
	},
	appendInitialChild: appendChildNode,
	appendChild: appendChildNode,
	insertBefore: insertBeforeNode,
	finalizeInitialChildren() {
		return false;
	},
	isPrimaryRenderer: true,
	supportsMutation: true,
	supportsPersistence: false,
	supportsHydration: false,
	// Scheduler integration for concurrent mode
	supportsMicrotasks: true,
	scheduleMicrotask: queueMicrotask,
	scheduleTimeout: setTimeout,
	cancelTimeout: clearTimeout,
	noTimeout: -1,
	beforeActiveInstanceBlur() {},
	afterActiveInstanceBlur() {},
	detachDeletedInstance() {},
	getInstanceFromNode: () => null,
	// Fragment refs (React 19.3) have no meaning in a terminal. Returning null makes a `<Fragment ref>` resolve to null instead of crashing inside React, and keeps React from calling the other fragment-instance hooks.
	createFragmentInstance: () => null,
	prepareScopeUpdate() {},
	getInstanceFromScope: () => null,
	appendChildToContainer: appendChildNode,
	insertInContainerBefore: insertBeforeNode,
	removeChildFromContainer(node, removedNode) {
		// `node` is the container, i.e. the root itself. Clear before
		// removeChildNode breaks the parent chain.
		clearStaticNodeIfContained(findRootNode(node), removedNode);

		removeChildNode(node, removedNode);
		freeYogaSubtree(removedNode);
	},
	commitUpdate(node, _type, oldProps, newProps) {
		if (node.internal_static) {
			const rootNode = findRootNode(node);

			if (rootNode) {
				rootNode.isStaticDirty = true;
			}
		}

		const props = diff(oldProps, newProps);

		const style = diff(
			oldProps['style'] as Styles,
			newProps['style'] as Styles,
		);

		if (!props && !style) {
			return;
		}

		if (props) {
			for (const [key, value] of Object.entries(props)) {
				if (key === 'style') {
					setStyle(node, value as Styles);
					continue;
				}

				if (key === 'internal_transform') {
					setTransform(node, value as OutputTransformer);
					continue;
				}

				if (key === 'internal_static') {
					node.internal_static = true;
					continue;
				}

				setAttribute(node, key, value as DOMNodeAttribute);
			}
		}

		if (style && node.yogaNode) {
			applyStyles(
				node.yogaNode,
				style,
				(newProps['style'] as Styles | undefined) ?? {},
			);
		}
	},
	commitTextUpdate(node, _oldText, newText) {
		setTextNodeValue(node, newText);
	},
	removeChild(node, removedNode) {
		// `node` is the host parent; its chain up to the root is still intact
		// here, so derive the owning root from it rather than a global.
		clearStaticNodeIfContained(findRootNode(node), removedNode);

		removeChildNode(node, removedNode);
		freeYogaSubtree(removedNode);
	},
	setCurrentUpdatePriority(newPriority: number) {
		currentUpdatePriority = newPriority;
	},
	getCurrentUpdatePriority: () => currentUpdatePriority,
	resolveUpdatePriority() {
		return currentUpdatePriority === NoEventPriority
			? DefaultEventPriority
			: currentUpdatePriority;
	},
	maySuspendCommit() {
		// Return true to enable Suspense resource preloading
		return true;
	},
	// Terminal host instances have no asynchronous resources to wait for on updates.
	maySuspendCommitOnUpdate: () => false,
	maySuspendCommitInSyncRender: () => false,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	NotPendingTransition: undefined,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	HostTransitionContext: createContext(
		null,
	) as unknown as ReactContext<unknown>,
	resetFormInstance() {},
	requestPostPaintCallback() {},
	shouldAttemptEagerTransition() {
		return false;
	},
	trackSchedulerEvent() {},
	resolveEventType() {
		return null;
	},
	resolveEventTimeStamp() {
		return -1.1;
	},
	preloadInstance() {
		return true;
	},
	startSuspendingCommit() {},
	suspendInstance() {},
	// Called for every transition-lane render since React 19.3. Ink has no view transitions, so there is never anything to wait for.
	suspendOnActiveViewTransition() {},
	waitForCommitToBeReady() {
		return null;
	},
	getSuspendedCommitReason: () => null,
	extraDevToolsConfig: null,
	bindToConsole(methodName, args) {
		// Replay React's captured console calls without browser-specific badge styling.
		const method: unknown = Reflect.get(console, methodName);
		return () => {
			if (typeof method === 'function') {
				Reflect.apply(method, console, args);
			}
		};
	},
	rendererPackageName: packageInfo.name,
	rendererVersion: packageInfo.version,
};

export default createReconciler(hostConfig);
