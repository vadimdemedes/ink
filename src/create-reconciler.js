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

export default onRender => {
	const rootHostContext = {};
	const childHostContext = {};

	const hostConfig = {
		schedulePassiveEffects,
		cancelPassiveEffects,
		now: Date.now,
		getRootHostContext: () => rootHostContext,
		prepareForCommit: () => {},
		resetAfterCommit: onRender,
		getChildHostContext: () => childHostContext,
		shouldSetTextContent: (type, props) => {
			return typeof props.children === 'string' || typeof props.children === 'number';
		},
		createInstance: (type, newProps) => {
			const node = createNode(type);

			for (const [key, value] of Object.entries(newProps)) {
				if (key === 'children') {
					if (typeof value === 'string' || typeof value === 'number') {
						// Text node must be wrapped in another node, so that text can be aligned within container
						const textElement = createNode('span');
						textElement.textContent = String(value);
						appendChildNode(node, textElement);
					}
				} else if (key === 'style') {
					Object.assign(node.style, value);
				} else if (key === 'unstable__transformChildren') {
					node.unstable__transformChildren = value; // eslint-disable-line camelcase
				} else if (key === 'static') {
					node.static = true;
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
						node.childNodes[0].textContent = String(value);
					}
				} else if (key === 'style') {
					Object.assign(node.style, value);
				} else if (key === 'unstable__transformChildren') {
					node.unstable__transformChildren = value; // eslint-disable-line camelcase
				} else if (key === 'static') {
					node.static = true;
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

	return ReactReconciler(hostConfig); // eslint-disable-line new-cap
};
