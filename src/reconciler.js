import {
	unstable_scheduleCallback as schedulePassiveEffects,
	unstable_cancelCallback as cancelPassiveEffects
} from 'scheduler';
import ReactReconciler from 'react-reconciler';

const NO_CONTEXT = true;

function createHostConfig(documentHelpers) {
	return {
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
			const node = documentHelpers.createNode(type);

			for (const [key, value] of Object.entries(newProps)) {
				if (key === 'children') {
					if (typeof value === 'string' || typeof value === 'number') {
						if (type === 'div') {
							// Text node must be wrapped in another node, so that text can be aligned within container
							const textElement = documentHelpers.createNode('div');
							textElement.textContent = String(value);
							documentHelpers.appendChildNode(node, textElement);
						}

						if (type === 'span') {
							node.textContent = String(value);
						}
					}
				} else if (key === 'style') {
					Object.assign(node.style, value);
				} else if (key === 'unstable__transformChildren') {
					node.unstable__transformChildren = value; // eslint-disable-line camelcase
				} else if (key === 'unstable__static') {
					node.unstable__static = true; // eslint-disable-line camelcase
				} else {
					documentHelpers.setAttribute(node, key, value);
				}
			}

			return node;
		},
		createTextInstance: documentHelpers.createTextNode,
		resetTextContent: node => {
			if (node.textContent) {
				node.textContent = '';
			}

			const childNodes = documentHelpers.getChildNodes(node);

			if (childNodes.length > 0) {
				for (const childNode of childNodes) {
					childNode.yogaNode.free();
					documentHelpers.removeChildNode(node, childNode);
				}
			}
		},
		getPublicInstance: instance => instance,
		appendInitialChild: documentHelpers.appendChildNode,
		appendChild: documentHelpers.appendChildNode,
		insertBefore: documentHelpers.insertBeforeNode,
		finalizeInitialChildren: () => {},
		supportsMutation: true,
		appendChildToContainer: documentHelpers.appendChildNode,
		insertInContainerBefore: documentHelpers.insertBeforeNode,
		removeChildFromContainer: documentHelpers.removeChildNode,
		prepareUpdate: () => true,
		commitUpdate: (node, updatePayload, type, oldProps, newProps) => {
			for (const [key, value] of Object.entries(newProps)) {
				if (key === 'children') {
					if (typeof value === 'string' || typeof value === 'number') {
						if (type === 'div') {
							// Text node must be wrapped in another node, so that text can be aligned within container
							// If there's no such node, a new one must be created
							if (node.childNodes.length === 0) {
								const textElement = documentHelpers.createNode('div');
								textElement.textContent = String(value);
								documentHelpers.appendChildNode(node, textElement);
							} else {
								node.childNodes[0].textContent = String(value);
							}
						}

						if (type === 'span') {
							node.textContent = String(value);
						}
					}
				} else if (key === 'style') {
					Object.assign(node.style, value);
				} else if (key === 'unstable__transformChildren') {
					node.unstable__transformChildren = value; // eslint-disable-line camelcase
				} else if (key === 'unstable__static') {
					node.unstable__static = true; // eslint-disable-line camelcase
				} else {
					documentHelpers.setAttribute(node, key, value);
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
		removeChild: documentHelpers.removeChildNode
	};
}

var _cachedReconciler = null; // eslint-disable-line no-var

export const createReconciler = documentHelpers => {
	if (_cachedReconciler) {
		return _cachedReconciler;
	}

	// Hopefully documentHelpers is the same...
	_cachedReconciler = ReactReconciler(createHostConfig(documentHelpers)); // eslint-disable-line new-cap
	return _cachedReconciler;
};
