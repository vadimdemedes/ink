import Yoga from 'yoga-layout-prebuilt';
import {Styles} from './styles';
import {OutputTransformer} from './render-node-to-output';
export type NodeNames = 'root' | 'div' | 'span';

export interface DOMNode {
	nodeName: string;
	style: Styles;
	attributes: {
		[key: string]: DOMNodeAttribute;
	};
	textContent?: string;
	childNodes: DOMNode[];
	parentNode?: DOMNode;
	onRender: () => void;
	unstable__transformChildren?: OutputTransformer;
	unstable__static?: boolean;
	yogaNode?: Yoga.YogaNode;
	nodeValue?: string;
}

export type DOMNodeAttribute = boolean | string | number;

// Helper utilities implementing some common DOM methods to simplify reconciliation code
export const createNode = (nodeName: NodeNames): DOMNode => ({
	nodeName: nodeName.toUpperCase(),
	style: {},
	attributes: {},
	childNodes: [],
	parentNode: null,
	onRender: () => {}
});

export const appendChildNode = (node: DOMNode, childNode: DOMNode) => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;

	node.childNodes.push(childNode);
};

// Same as `appendChildNode`, but without removing child node from parent node
export const appendStaticNode = (node: DOMNode, childNode: DOMNode) => {
	node.childNodes.push(childNode);
};

export const insertBeforeNode = (
	node: DOMNode,
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
		return;
	}

	node.childNodes.push(newChildNode);
};

export const removeChildNode = (node: DOMNode, removeNode: DOMNode) => {
	removeNode.parentNode = null;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}
};

export const setAttribute = (
	node: DOMNode,
	key: string,
	value: DOMNodeAttribute
) => {
	node.attributes[key] = value;
};

export const createTextNode = (text: string) => ({
	nodeName: '#text',
	nodeValue: text
});
