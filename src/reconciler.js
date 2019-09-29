import {
	unstable_scheduleCallback as schedulePassiveEffects,
	unstable_cancelCallback as cancelPassiveEffects
} from 'scheduler';
import ReactReconciler from 'react-reconciler';
import {
	createNode,
	createTextNode,
	appendChildNode,
	insertBeforeNode,
	removeChildNode,
	setAttribute
} from './dom';

const NO_CONTEXT = true;

const hostConfig = {
	schedulePassiveEffects,
	cancelPassiveEffects,
	now: Date.now,
	getRootHostContext: () => NO_CONTEXT,
	prepareForCommit: () => {},
	resetAfterCommit: rootNode => {
		rootNode.onRender();
	},
	getChildHostContext: () => NO_CONTEXT,
	shouldSetTextContent: (type, props) => {
		return typeof props.children === 'string' || typeof props.children === 'number';
	},
	createInstance: (type, newProps) => {
		const node = createNode(type);

		for (const [key, value] of Object.entries(newProps)) {
			if (key === 'children') {
				if (typeof value === 'string' || typeof value === 'number') {
					if (type === 'div') {
						// Text node must be wrapped in another node, so that text can be aligned within container
						const textElement = createNode('div');
						textElement.textContent = String(value);
						appendChildNode(node, textElement);
					}

					if (type === 'span') {
						node.textContent = String(value);
					}
				}
			} else if (key === 'style') {
				node.style = value;
			} else if (key === 'unstable__transformChildren') {
				node.unstable__transformChildren = value; // eslint-disable-line camelcase
			} else if (key === 'unstable__static') {
				node.unstable__static = true; // eslint-disable-line camelcase
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
				childNode.yogaNode.free();
				removeChildNode(node, childNode);
			}
		}
	},
	getPublicInstance: instance => instance,
	appendInitialChild: appendChildNode,
	appendChild: appendChildNode,
	insertBefore: insertBeforeNode,
	finalizeInitialChildren: () => {},
	supportsMutation: true,
	appendChildToContainer: appendChildNode,
	insertInContainerBefore: insertBeforeNode,
	removeChildFromContainer: removeChildNode,
	prepareUpdate: () => true,
	commitUpdate: (node, updatePayload, type, oldProps, newProps) => {
		for (const [key, value] of Object.entries(newProps)) {
			if (key === 'children') {
				if (typeof value === 'string' || typeof value === 'number') {
					if (type === 'div') {
						// Text node must be wrapped in another node, so that text can be aligned within container
						// If there's no such node, a new one must be created
						if (node.childNodes.length === 0) {
							const textElement = createNode('div');
							textElement.textContent = String(value);
							appendChildNode(node, textElement);
						} else {
							node.childNodes[0].textContent = String(value);
						}
					}

					if (type === 'span') {
						node.textContent = String(value);
					}
				}
			} else if (key === 'style') {
				node.style = value;
			} else if (key === 'unstable__transformChildren') {
				node.unstable__transformChildren = value; // eslint-disable-line camelcase
			} else if (key === 'unstable__static') {
				node.unstable__static = true; // eslint-disable-line camelcase
			} else {
				setAttribute(node, key, value);
			}
		}
	},
	commitTextUpdate: (node, oldText, newText) => {
		if (node.nodeName === '#text') {
			node.nodeValue = newText;
		} else {
			node.textContent = newText;
		}
	},
	removeChild: removeChildNode
};

export default ReactReconciler(hostConfig); // eslint-disable-line new-cap
