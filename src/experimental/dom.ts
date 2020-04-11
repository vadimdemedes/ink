import Yoga from 'yoga-layout-prebuilt';
import {measureText} from '../measure-text';
import {applyStyle} from './apply-style';
import {TextNode, DOMNode, DOMElement, ElementNames} from '../dom';
import {Styles} from '../styles';

export type NodeNames = 'root' | 'div' | 'span';

export const createNode = (nodeName: ElementNames): DOMElement => ({
	nodeName: nodeName.toUpperCase() as ElementNames,
	style: {},
	attributes: {},
	childNodes: [],
	parentNode: null,
	yogaNode: Yoga.Node.create()
});

export const appendChildNode = (
	node: DOMElement,
	childNode: DOMElement
) => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;

	node.childNodes.push(childNode);
	if (childNode.yogaNode) {
		node.yogaNode?.insertChild(childNode.yogaNode, node.yogaNode.getChildCount());
	}
};

export const insertBeforeNode = (
	node: DOMElement,
	newChildNode: DOMNode,
	beforeChildNode: DOMNode
) => {
	if (newChildNode.parentNode) {
		removeChildNode(newChildNode.parentNode, newChildNode);
	}

	newChildNode.parentNode = node;

	const index = node.childNodes.indexOf(beforeChildNode);
	if (index >= 0) {
		node.childNodes.splice(index, 0, newChildNode);
		if (newChildNode.yogaNode) {
			node.yogaNode?.insertChild(newChildNode.yogaNode, index);
		}

		return;
	}

	node.childNodes.push(newChildNode);
	if (newChildNode.yogaNode) {
		node.yogaNode?.insertChild(
			newChildNode.yogaNode,
			node.yogaNode.getChildCount()
		);
	}
};

export const removeChildNode = (
	node: DOMElement,
	removeNode: DOMNode
) => {
	if (removeNode.yogaNode) {
		removeNode.parentNode?.yogaNode?.removeChild(removeNode.yogaNode);
	}

	removeNode.parentNode = null;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}
};

export const setStyle = (node: DOMNode, style: Styles) => {
	node.style = style;
	if (node.yogaNode) {
		applyStyle(node.yogaNode, style);
	}
};

export const createTextNode = (text: string): TextNode => {
	const node: TextNode = {
		nodeName: '#text',
		nodeValue: text,
		yogaNode: Yoga.Node.create(),
		parentNode: null,
		style: {}
	};

	setTextContent(node, text);

	return node;
};

export const setTextContent = (node: DOMNode, text: string) => {
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
		node.yogaNode?.setWidth(width);
		node.yogaNode?.setHeight(height);
	} else {
		node.textContent = text;
		node.yogaNode?.setWidth(node.style.width ?? width);
		node.yogaNode?.setHeight(node.style.height ?? height);
	}
};
