import ReactReconciler from 'react-reconciler';
import {
	createNode,
	createTextNode,
	appendChildNode,
	insertBeforeNode,
	removeChildNode,
	setAttribute
} from './dom';

const applyProps = (node, props) => {
	for (const [key, value] of Object.entries(props)) {
		if (key === 'style') {
			Object.assign(node.style, value);
		} else if (key === 'unstable__transformChildren') {
			node.unstable__transformChildren = value; // eslint-disable-line camelcase
		} else if (key === 'static') {
			node.static = true;
		} else {
			setAttribute(node, key, value);
		}
	}
};

export default onRender => {
	const rootHostContext = {};
	const childHostContext = {};

	const hostConfig = {
		now: Date.now,
		getRootHostContext: () => rootHostContext,
		prepareForCommit: () => {},
		resetAfterCommit: () => {},
		getChildHostContext: () => childHostContext,
		shouldSetTextContent: () => false,
		createInstance: (type, newProps) => {
			const node = createNode(type);
			applyProps(node, newProps);

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
		appendChildToContainer: (parentNode, childNode) => {
			appendChildNode(parentNode, childNode);
			onRender();
		},
		removeChildFromContainer: (parentNode, childNode) => {
			removeChildNode(parentNode, childNode);
			onRender();
		},
		prepareUpdate: () => true,
		commitUpdate: (node, updatePayload, type, oldProps, newProps) => {
			applyProps(node, newProps);
			onRender();
		},
		commitTextUpdate: (node, oldText, newText) => {
			if (node.nodeName === '#text') {
				node.nodeValue = newText;
			} else {
				node.textContent = newText;
			}

			onRender();
		},
		removeChild: (parentNode, childNode) => {
			removeChildNode(parentNode, childNode);
			onRender();
		}
	};

	return ReactReconciler(hostConfig); // eslint-disable-line new-cap
};
