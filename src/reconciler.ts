import {ReactNode} from 'react';
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
	setTextContent,
	createNode,
	setAttribute,
	DOMNode,
	TextNode,
	ElementNames,
	DOMElement
} from './dom';
// eslint-disable-next-line import/no-unassigned-import
import './devtools';

const cleanupYogaNode = (node: Yoga.YogaNode): void => {
	node.unsetMeasureFunc();
};

const NO_CONTEXT = true;

interface Props {
	children: ReactNode;
}

export const reconciler = createReconciler<
	ElementNames,
	Props,
	DOMElement,
	DOMElement,
	DOMNode,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown
>({
	// @ts-ignore
	schedulePassiveEffects,
	cancelPassiveEffects,
	now: Date.now,
	getRootHostContext: () => NO_CONTEXT,
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
	getChildHostContext: () => NO_CONTEXT,
	shouldSetTextContent: (_type, props) => {
		return (
			typeof props.children === 'string' || typeof props.children === 'number'
		);
	},
	createInstance: (type, newProps) => {
		const node = createNode(type);

		for (const [key, value] of Object.entries(newProps)) {
			if (key === 'children') {
				if (typeof value === 'string' || typeof value === 'number') {
					if (type === 'div') {
						// Text node must be wrapped in another node, so that text can be aligned within container
						const textNode = createNode('div');
						setTextContent(textNode, String(value));
						appendChildNode(node, textNode);
					}

					if (type === 'span') {
						setTextContent(node, String(value));
					}
				}
			} else if (key === 'style') {
				setStyle(node, value);
			} else if (key === 'internal_transform') {
				node.internal_transform = value;
			} else if (key === 'internal_static') {
				node.internal_static = true;
			} else {
				setAttribute(node, key, value);
			}
		}

		return node;
	},
	createTextInstance: createTextNode,
	resetTextContent: node => {
		if (node.textContent) {
			node.textContent = '';
		}

		if (node.childNodes.length > 0) {
			for (const childNode of node.childNodes) {
				removeChildNode(node, childNode);
				cleanupYogaNode(childNode.yogaNode!);
			}
		}
	},
	hideTextInstance: (node: TextNode): void => {
		node.nodeValue = '';
	},
	unhideTextInstance: (node: TextNode, text: string): void => {
		node.nodeValue = text;
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
		cleanupYogaNode(removeNode.yogaNode!);
	},
	prepareUpdate: (node, _type, _oldProps, _newProps, rootNode) => {
		if (node.internal_static) {
			rootNode.isStaticDirty = true;
		}

		return true;
	},
	commitUpdate: (node, _updatePayload, type, _oldProps, newProps) => {
		for (const [key, value] of Object.entries(newProps)) {
			if (key === 'children') {
				if (typeof value === 'string' || typeof value === 'number') {
					if (type === 'div') {
						// Text node must be wrapped in another node, so that text can be aligned within container
						// If there's no such node, a new one must be created
						if (node.childNodes.length === 0) {
							const textNode = createNode('div');
							setTextContent(textNode, String(value));
							appendChildNode(node, textNode);
						} else {
							setTextContent(node.childNodes[0], String(value));
						}
					}

					if (type === 'span') {
						setTextContent(node, String(value));
					}
				}
			} else if (key === 'style') {
				setStyle(node, value);
			} else if (key === 'internal_transform') {
				node.internal_transform = value;
			} else if (key === 'internal_static') {
				node.internal_static = true;
			} else {
				setAttribute(node, key, value);
			}
		}
	},
	commitTextUpdate: (node, _oldText, newText) => {
		setTextContent(node, newText);
	},
	removeChild: (node, removeNode) => {
		removeChildNode(node, removeNode);
		cleanupYogaNode(removeNode.yogaNode!);
	}
});
