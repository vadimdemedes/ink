// Helper utilities implementing some common DOM methods to simplify reconciliation code
const _documentCreateNode = (document, tagName) => {
	return document.createElement(tagName);
};

const _documentAppendChildNode = (node, childNode) => {
	if (childNode.parentNode) {
		childNode.parentNode.removeChild(childNode);
	}

	node.append(childNode);
}; // Same as `appendChildNode`, but without removing child node from parent node

const _documentAppendStaticNode = (node, childNode) => {
	node.append(childNode);
};

const _documentInsertBeforeNode = (node, newChildNode, beforeChildNode) => {
	if (newChildNode.parentNode) {
		newChildNode.parentNode.removeChild(newChildNode);
	}

	node.insertBefore(newChildNode, beforeChildNode);
};

const _documentRemoveChildNode = (node, removeNode) => {
	node.removeChild(removeNode);
};

const _documentSetAttribute = (node, key, value) => {
	node.setAttribute(key, value);
};

const _documentCreateTextNode = (document, text) => {
	return document.createTextNode(text);
};

const _documentGetChildNodes = node => {
	return [...node.childNodes];
};

const _documentGetTextContent = node => {
	if (node.nodeType === 3) {
		return node.data;
	}

	return null;
};

// Helper utilities implementing some common DOM methods to simplify reconciliation code
const _createNode = tagName => ({
	nodeName: tagName.toUpperCase(),
	style: {},
	attributes: {},
	childNodes: [],
	parentNode: null
});

const _appendChildNode = (node, childNode) => {
	if (childNode.parentNode) {
		_removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;

	node.childNodes.push(childNode);
};

// Same as `appendChildNode`, but without removing child node from parent node
const _appendStaticNode = (node, childNode) => {
	node.childNodes.push(childNode);
};

const _insertBeforeNode = (node, newChildNode, beforeChildNode) => {
	if (newChildNode.parentNode) {
		_removeChildNode(newChildNode.parentNode, newChildNode);
	}

	newChildNode.parentNode = node;

	const index = node.childNodes.indexOf(beforeChildNode);
	if (index >= 0) {
		node.childNodes.splice(index, 0, newChildNode);
		return;
	}

	node.childNodes.push(newChildNode);
};

const _removeChildNode = (node, removeNode) => {
	removeNode.parentNode = null;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}
};

const _setAttribute = (node, key, value) => {
	node.attributes[key] = value;
};

const _createTextNode = text => ({
	nodeName: '#text',
	nodeValue: text
});

const _getChildNodes = node => {
	return node.childNodes;
};

const _getTextContent = node => {
	return node.textContent;
};

export const createDocumentHelpers = document => {
	if (document) {
		return Object.freeze({
			createNode: tagName => _documentCreateNode(document, tagName),
			appendChildNode: _documentAppendChildNode,
			appendStaticNode: _documentAppendStaticNode,
			insertBeforeNode: _documentInsertBeforeNode,
			removeChildNode: _documentRemoveChildNode,
			setAttribute: _documentSetAttribute,
			createTextNode: text => _documentCreateTextNode(document, text),
			getChildNodes: _documentGetChildNodes,
			getTextContent: _documentGetTextContent
		});
	}

	return Object.freeze({
		createNode: _createNode,
		appendChildNode: _appendChildNode,
		appendStaticNode: _appendStaticNode,
		insertBeforeNode: _insertBeforeNode,
		removeChildNode: _removeChildNode,
		setAttribute: _setAttribute,
		createTextNode: _createTextNode,
		getChildNodes: _getChildNodes,
		getTextContent: _getTextContent
	});
};
