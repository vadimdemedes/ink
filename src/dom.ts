import Yoga from 'yoga-layout-prebuilt';
import {measureText} from './measure-text';
import {applyStyles} from './apply-styles';
import {wrapText} from './wrap-text';
import {OutputTransformer} from './render-node-to-output';
import {Styles} from './styles';

interface InkNode {
	parentNode: DOMElement | null;
	yogaNode?: Yoga.YogaNode;
	internal_static?: boolean;
	style: Styles;
}

export const TEXT_NAME = '#text';
export type TextName = '#text';
export type ElementNames = 'root' | 'div' | 'span' | 'ROOT' | 'DIV' | 'SPAN';
export type NodeNames = ElementNames | TextName;

export type DOMElement = {
	nodeName: ElementNames;
	attributes: {
		[key: string]: DOMNodeAttribute;
	};
	textContent?: string;
	childNodes: DOMNode[];
	internal_transform?: OutputTransformer;

	// Internal properties
	isStaticDirty?: boolean;
	staticNode?: any;
	onRender?: () => void;
	onImmediateRender?: () => void;
} & InkNode;

export type TextNode = {
	nodeName: TextName;
	nodeValue: string;
} & InkNode;

export type DOMNode<T = {nodeName: NodeNames}> = T extends {
	nodeName: infer U;
}
	? U extends '#text'
		? TextNode
		: DOMElement
	: never;

export type DOMNodeAttribute = boolean | string | number;

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
): void => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;
	node.childNodes.push(childNode);

	if (childNode.yogaNode) {
		node.yogaNode?.insertChild(
			childNode.yogaNode,
			node.yogaNode.getChildCount()
		);
	}
};

export const insertBeforeNode = (
	node: DOMElement,
	newChildNode: DOMNode,
	beforeChildNode: DOMNode
): void => {
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
): void => {
	if (removeNode.yogaNode) {
		removeNode.parentNode?.yogaNode?.removeChild(removeNode.yogaNode);
	}

	removeNode.parentNode = null;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}
};

export const setAttribute = (
	node: DOMElement,
	key: string,
	value: DOMNodeAttribute
): void => {
	node.attributes[key] = value;
};

export const setStyle = (node: DOMNode, style: Styles): void => {
	node.style = style;

	if (node.yogaNode) {
		applyStyles(node.yogaNode, style);
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

const measureTextNode = function (
	node: DOMNode,
	text: string,
	width: number
): {width: number; height: number} {
	const dimensions = measureText(text);

	// Text fits into container, no need to wrap
	if (dimensions.width <= width) {
		return dimensions;
	}

	const wrapType = node.parentNode?.style?.textWrap ?? 'wrap';
	const wrappedText = wrapText(text, width, wrapType);

	return measureText(wrappedText);
};

export const setTextContent = (node: DOMNode, text: string): void => {
	if (typeof text !== 'string') {
		text = String(text);
	}

	if (node.nodeName === '#text') {
		node.nodeValue = text;
	} else {
		node.textContent = text;
	}

	node.yogaNode?.setMeasureFunc(measureTextNode.bind(null, node, text));
};
