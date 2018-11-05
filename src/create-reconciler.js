import ReactReconciler from 'react-reconciler';

export default (document, onRender) => {
	const rootHostContext = {};
	const childHostContext = {};

	const hostConfig = {
		now: Date.now,
		getRootHostContext: () => rootHostContext,
		prepareForCommit: () => {},
		resetAfterCommit: () => {},
		getChildHostContext: () => childHostContext,
		shouldSetTextContent: (type, props) => {
			return typeof props.children === 'string' || typeof props.children === 'number';
		},
		createInstance: (type, newProps) => {
			const element = document.createElement(type);

			for (const [key, value] of Object.entries(newProps)) {
				if (key === 'children') {
					if (typeof value === 'string' || typeof value === 'number') {
						// Text node must be wrapped in another node, so that text can be aligned within container
						const textElement = document.createElement('span');
						textElement.textContent = value;
						element.appendChild(textElement);
					}
				} else if (key === 'style') {
					Object.assign(element.style, value);
				} else if (key === 'unstable__transformChildren') {
					element.unstable__transformChildren = value; // eslint-disable-line camelcase
				} else {
					element.setAttribute(key, value);
				}
			}

			return element;
		},
		createTextInstance: text => document.createTextNode(text),
		resetTextContent: () => {},
		getPublicInstance: instance => instance,
		appendInitialChild: (parent, child) => parent.appendChild(child),
		appendChild: (parent, child) => parent.appendChild(child),
		insertBefore: (parent, child, beforeChild) => parent.insertBefore(child, beforeChild),
		finalizeInitialChildren: () => {},
		supportsMutation: true,
		appendChildToContainer: (parent, child) => {
			parent.appendChild(child);
			onRender();
		},
		removeChildFromContainer: (parent, child) => {
			parent.removeChild(child);
			onRender();
		},
		prepareUpdate: () => true,
		commitUpdate: (element, updatePayload, type, oldProps, newProps) => {
			for (const [key, value] of Object.entries(newProps)) {
				if (key === 'children') {
					if (typeof value === 'string' || typeof value === 'number') {
						element.childNodes[0].textContent = value;
					}
				} else if (key === 'style') {
					Object.assign(element.style, value);
				} else if (key === 'unstable__transformChildren') {
					element.unstable__transformChildren = value; // eslint-disable-line camelcase
				} else {
					element.setAttribute(key, value);
				}
			}

			onRender();
		},
		commitTextUpdate: (element, oldText, newText) => {
			element.textContent = newText;
			onRender();
		},
		removeChild: (parent, child) => {
			parent.removeChild(child);
			onRender();
		}
	};

	return ReactReconciler(hostConfig); // eslint-disable-line new-cap
};
