import Yoga from 'yoga-layout-prebuilt';
import measureText from '../measure-text';
import applyStyle from './apply-style';
import {DOMNodeAttribute} from '../dom';
import {Styles} from '../styles';
import {OutputTransformer} from '../render-node-to-output';

export type NodeNames = 'root' | 'div' | 'span';

export interface ExperimentalDOMNode {
	nodeName: NodeNames;
	style: Styles;
	attributes: {
		[key: string]: DOMNodeAttribute;
	};
	childNodes: ExperimentalDOMNode[];
	parentNode?: ExperimentalDOMNode;
	textContent: string | null;
	nodeValue?: string | null;
	yogaNode: Yoga.YogaNode;
	onRender: () => void;
	onImmediateRender: () => void;
	unstable__transformChildren?: OutputTransformer;
	unstable__static?: boolean;
	isStaticDirty?: boolean;
}

export type NodeTextTypes = ExperimentalDOMNode | ExperimentalTextNode;

export interface ExperimentalTextNode {
	nodeName: '#text';
	nodeValue: string | null;
	yogaNode: Yoga.YogaNode;
}

// Helper utilities implementing some common DOM methods to simplify reconciliation code
export const createNode = (nodeName: NodeNames): ExperimentalDOMNode => ({
	nodeName: nodeName.toUpperCase() as NodeNames,
	style: {},
	attributes: {},
	childNodes: [],
	parentNode: null,
	textContent: null,
	yogaNode: Yoga.Node.create(),
	onRender: () => {},
	onImmediateRender: () => {}
});

export const appendChildNode = (
	node: ExperimentalDOMNode,
	childNode: ExperimentalDOMNode
) => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;

	node.childNodes.push(childNode);
	node.yogaNode.insertChild(childNode.yogaNode, node.yogaNode.getChildCount());
};

export const insertBeforeNode = (
	node: ExperimentalDOMNode,
	newChildNode: ExperimentalDOMNode,
	beforeChildNode: ExperimentalDOMNode
) => {
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
	node.yogaNode.insertChild(
		newChildNode.yogaNode,
		node.yogaNode.getChildCount()
	);
};

export const removeChildNode = (
	node: ExperimentalDOMNode,
	removeNode: ExperimentalDOMNode
) => {
	removeNode.parentNode.yogaNode.removeChild(removeNode.yogaNode);
	removeNode.parentNode = null;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}
};

export const setStyle = (node: ExperimentalDOMNode, style: Styles) => {
	node.style = style;
	applyStyle(node.yogaNode, style);
};

export const setAttribute = (
	node: ExperimentalDOMNode,
	key: string,
	value: string
) => {
	node.attributes[key] = value;
};

export const createTextNode = (text: string): ExperimentalTextNode => {
	const node: ExperimentalTextNode = {
		nodeName: '#text',
		nodeValue: text,
		yogaNode: Yoga.Node.create()
	};

	setTextContent(node, text);

	return node;
};

export const setTextContent = (node: NodeTextTypes, text: string) => {
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
