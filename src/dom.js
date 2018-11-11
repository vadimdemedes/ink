// Helper utilities implementing some common DOM methods to simplify reconciliation code
export const createNode = tagName => ({
	nodeName: tagName.toUpperCase(),
	style: {},
	attributes: {},
	childNodes: []
});

export const appendChildNode = (node, childNode) => {
	node.childNodes.push(childNode);
};

export const insertBeforeNode = (node, newChildNode, beforeChildNode) => {
	const index = node.childNodes.indexOf(beforeChildNode);
	if (index >= 0) {
		node.childNodes.splice(index, 0, newChildNode);
		return;
	}

	node.childNodes.push(newChildNode);
};

export const removeChildNode = (node, removeNode) => {
	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}
};

export const setAttribute = (node, key, value) => {
	node.attributes[key] = value;
};

export const createTextNode = text => ({
	nodeName: '#text',
	nodeValue: text
});
