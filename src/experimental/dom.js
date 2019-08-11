import Yoga from 'yoga-layout-prebuilt';
import measureText from '../measure-text';
import applyStyle from './apply-style';

// Helper utilities implementing some common DOM methods to simplify reconciliation code
export const createNode = tagName => ({
	nodeName: tagName.toUpperCase(),
	style: {},
	attributes: {},
	childNodes: [],
	parentNode: null,
	textContent: null,
	yogaNode: Yoga.Node.create()
});

export const appendChildNode = (node, childNode) => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;

	node.childNodes.push(childNode);
	node.yogaNode.insertChild(childNode.yogaNode, node.yogaNode.getChildCount());
};

export const insertBeforeNode = (node, newChildNode, beforeChildNode) => {
	if (newChildNode.parentNode) {
		removeChildNode(newChildNode.parentNode, newChildNode);
	}

	newChildNode.parentNode = node;

	const index = node.childNodes.indexOf(beforeChildNode);
	if (index >= 0) {
		node.childNodes.splice(index, 0, newChildNode);
		node.yogaNode.insertChild(newChildNode.yogaNode, index);
		return;
	}

	node.childNodes.push(newChildNode);
	node.yogaNode.insertChild(newChildNode.yogaNode, node.yogaNode.getChildCount());
};

export const removeChildNode = (node, removeNode) => {
	removeNode.parentNode.yogaNode.removeChild(removeNode.yogaNode);
	removeNode.parentNode = null;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}
};

export const setStyle = (node, style) => {
	node.style = style;
	applyStyle(node.yogaNode, style);
};

export const setAttribute = (node, key, value) => {
	node.attributes[key] = value;
};

export const createTextNode = text => {
	const node = {
		nodeName: '#text',
		nodeValue: text,
		yogaNode: Yoga.Node.create()
	};

	setTextContent(node, text);

	return node;
};

export const setTextContent = (node, text) => {
	if (typeof text !== 'string') {
		text = String(text);
	}

	let width = 0;
	let height = 0;

	if (text.length > 0) {
		const dimensions = measureText(text);
		width = dimensions.width;
		height = dimensions.height;
	}

	if (node.nodeName === '#text') {
		node.nodeValue = text;
		node.yogaNode.setWidth(width);
		node.yogaNode.setHeight(height);
	} else {
		node.textContent = text;
		node.yogaNode.setWidth(node.style.width || width);
		node.yogaNode.setHeight(node.style.height || height);
	}
};
