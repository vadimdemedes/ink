import Yoga from 'yoga-layout-prebuilt';
import {Styles} from './styles';
import {OutputTransformer} from './render-node-to-output';

interface InkNode {
	parentNode: DOMElement | null;
	yogaNode?: Yoga.YogaNode;
	unstable__static?: boolean;
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
	unstable__transformChildren?: OutputTransformer;

	onRender?: () => void;

	// Experimental properties
	isStaticDirty?: boolean;
	onImmediateRender?: () => void;
} & InkNode;

export type TextNode = {
	nodeName: TextName;
	nodeValue: string;
} & InkNode;

export type DOMNode<T = { nodeName: NodeNames }> = T extends {
	nodeName: infer U;
}
	? U extends '#text'
		? TextNode
		: DOMElement
	: never;

export type DOMNodeAttribute = boolean | string | number;

// Helper utilities implementing some common DOM methods to simplify reconciliation code
export const createNode = (nodeName: ElementNames): DOMElement => ({
	nodeName: nodeName.toUpperCase() as ElementNames,
	style: {},
	attributes: {},
	childNodes: [],
	parentNode: null,
	yogaNode: undefined
});

export const appendChildNode = (node: DOMElement, childNode: DOMElement) => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;

	node.childNodes.push(childNode);
};

// Same as `appendChildNode`, but without removing child node from parent node
export const appendStaticNode = (node: DOMElement, childNode: DOMNode) => {
	node.childNodes.push(childNode);
};

export const insertBeforeNode = (
	node: DOMElement,
	newChildNode: DOMElement,
	beforeChildNode: DOMNode
) => {
	if (newChildNode.parentNode) {
		removeChildNode(newChildNode.parentNode, newChildNode);
	}

	newChildNode.parentNode = node;

	const index = node.childNodes.indexOf(beforeChildNode);
	if (index >= 0) {
		node.childNodes.splice(index, 0, newChildNode);
		return;
	}

	node.childNodes.push(newChildNode);
};

export const removeChildNode = (node: DOMElement, removeNode: DOMNode) => {
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
) => {
	node.attributes[key] = value;
};

export const createTextNode = (text: string): TextNode => ({
	nodeName: TEXT_NAME,
	nodeValue: text,
	parentNode: null,
	yogaNode: undefined,
	style: {}
});

export const isElement = (node: DOMNode) => node.nodeName !== TEXT_NAME;
export const isText = (node: DOMNode) => node.nodeName === TEXT_NAME;
