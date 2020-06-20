import {
	unstable_scheduleCallback as schedulePassiveEffects,
	unstable_cancelCallback as cancelPassiveEffects
} from 'scheduler';
import createReconciler from 'react-reconciler';
import Yoga from 'yoga-layout-prebuilt';
import {
	createTextNode,
	appendChildNode,
	insertBeforeNode,
	removeChildNode,
	setStyle,
	setTextNodeValue,
	createNode,
	setAttribute
} from './dom';
import type {
	DOMNode,
	DOMNodeAttribute,
	TextNode,
	ElementNames,
	DOMElement
} from './dom';
import type {Styles} from './styles';
import type {OutputTransformer} from './render-node-to-output';
// eslint-disable-next-line import/no-unassigned-import
import './devtools';

const cleanupYogaNode = (node?: Yoga.YogaNode): void => {
	node?.unsetMeasureFunc();
	node?.freeRecursive();
};

interface Props {
	[key: string]: unknown;
}

interface HostContext {
	isInsideText: boolean;
}

export default createReconciler<
	ElementNames,
	Props,
	DOMElement,
	DOMElement,
	DOMNode,
	unknown,
	unknown,
	HostContext,
	Props,
	unknown,
	unknown,
	unknown
>({
	// @ts-ignore
	schedulePassiveEffects,
	cancelPassiveEffects,
	now: Date.now,
	getRootHostContext: () => ({
		isInsideText: false
	}),
	prepareForCommit: () => {},
	resetAfterCommit: rootNode => {
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
	getChildHostContext: (parentHostContext, type) => {
		const previousIsInsideText = parentHostContext.isInsideText;
		const isInsideText = type === 'ink-text' || type === 'ink-virtual-text';

		if (previousIsInsideText === isInsideText) {
			return parentHostContext;
		}

		return {isInsideText};
	},
	shouldSetTextContent: () => false,
	createInstance: (originalType, newProps, _root, hostContext) => {
		const type =
			originalType === 'ink-text' && hostContext.isInsideText
				? 'ink-virtual-text'
				: originalType;

		const node = createNode(type);

		for (const [key, value] of Object.entries(newProps)) {
			if (key === 'children') {
				continue;
			} else if (key === 'style') {
				setStyle(node, value as Styles);
			} else if (key === 'internal_transform') {
				node.internal_transform = value as OutputTransformer;
			} else if (key === 'internal_static') {
				node.internal_static = true;
			} else {
				setAttribute(node, key, value as DOMNodeAttribute);
			}
		}

		return node;
	},
	createTextInstance: (text, _root, hostContext) => {
		if (!hostContext.isInsideText) {
			throw new Error(
				`Text string "${text}" must be rendered inside <Text> component`
			);
		}

		return createTextNode(text);
	},
	resetTextContent: () => {},
	hideTextInstance: (node: TextNode): void => {
		setTextNodeValue(node, '');
	},
	unhideTextInstance: (node: TextNode, text: string): void => {
		setTextNodeValue(node, text);
	},
	getPublicInstance: instance => instance,
	hideInstance: (node: DOMElement): void => {
		node.yogaNode?.setDisplay(Yoga.DISPLAY_NONE);
	},
	unhideInstance: (node: DOMElement): void => {
		node.yogaNode?.setDisplay(Yoga.DISPLAY_FLEX);
	},
	appendInitialChild: appendChildNode,
	appendChild: appendChildNode,
	insertBefore: insertBeforeNode,
	finalizeInitialChildren: (node, _type, _props, rootNode) => {
		if (node.internal_static) {
			rootNode.isStaticDirty = true;

			// Save reference to <Static> node to skip traversal of entire
			// node tree to find it
			rootNode.staticNode = node;
		}

		return false;
	},
	supportsMutation: true,
	appendChildToContainer: appendChildNode,
	insertInContainerBefore: insertBeforeNode,
	removeChildFromContainer: (node, removeNode) => {
		removeChildNode(node, removeNode);
		cleanupYogaNode(removeNode.yogaNode);
	},
	prepareUpdate: (node, _type, oldProps, newProps, rootNode) => {
		if (node.internal_static) {
			rootNode.isStaticDirty = true;
		}

		const updatePayload: Props = {};
		const keys = Object.keys(newProps);

		for (const key of keys) {
			if (newProps[key] !== oldProps[key]) {
				const isStyle =
					key === 'style' &&
					typeof newProps.style === 'object' &&
					typeof oldProps.style === 'object';

				if (isStyle) {
					const newStyle = newProps.style as Styles;
					const oldStyle = oldProps.style as Styles;
					const styleKeys = Object.keys(newStyle) as Array<keyof Styles>;

					for (const styleKey of styleKeys) {
						if (newStyle[styleKey] !== oldStyle[styleKey]) {
							if (typeof updatePayload.style !== 'object') {
								// Linter didn't like `= {} as Style`
								const style: Styles = {};
								updatePayload.style = style;
							}

							(updatePayload.style as any)[styleKey] = newStyle[styleKey];
						}
					}

					continue;
				}

				(updatePayload as any)[key] = newProps[key];
			}
		}

		return updatePayload;
	},
	commitUpdate: (node, updatePayload) => {
		for (const [key, value] of Object.entries(updatePayload)) {
			if (key === 'children') {
				continue;
			} else if (key === 'style') {
				setStyle(node, value as Styles);
			} else if (key === 'internal_transform') {
				node.internal_transform = value as OutputTransformer;
			} else if (key === 'internal_static') {
				node.internal_static = true;
			} else {
				setAttribute(node, key, value as DOMNodeAttribute);
			}
		}
	},
	commitTextUpdate: (node, _oldText, newText) => {
		setTextNodeValue(node as TextNode, newText);
	},
	removeChild: (node, removeNode) => {
		removeChildNode(node, removeNode);
		cleanupYogaNode(removeNode.yogaNode);
	}
});
