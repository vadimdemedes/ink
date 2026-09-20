import Yoga, {type Node as YogaNode, type MeasureMode} from 'yoga-layout';
import measureText from './measure-text.js';
import {type Styles} from './styles.js';
import wrapText from './wrap-text.js';
import squashTextNodes from './squash-text-nodes.js';
import {type OutputTransformer} from './render-node-to-output.js';

type InkNode = {
	parentNode: DOMElement | undefined;
	yogaNode?: YogaNode;
	internal_static?: boolean;
	style: Styles;
};

type LayoutListener = () => void;

export type TextName = '#text';
export type ElementNames =
	'ink-root' | 'ink-box' | 'ink-text' | 'ink-virtual-text';

export type NodeNames = ElementNames | TextName;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type DOMElement = {
	nodeName: ElementNames;
	attributes: Record<string, DOMNodeAttribute>;
	childNodes: DOMNode[];
	internal_transform?: OutputTransformer;

	internal_accessibility?: {
		role?:
			| 'button'
			| 'checkbox'
			| 'combobox'
			| 'list'
			| 'listbox'
			| 'listitem'
			| 'menu'
			| 'menuitem'
			| 'option'
			| 'progressbar'
			| 'radio'
			| 'radiogroup'
			| 'tab'
			| 'tablist'
			| 'table'
			| 'textbox'
			| 'timer'
			| 'toolbar';
		state?: {
			busy?: boolean;
			checked?: boolean;
			disabled?: boolean;
			expanded?: boolean;
			multiline?: boolean;
			multiselectable?: boolean;
			readonly?: boolean;
			required?: boolean;
			selected?: boolean;
		};
	};

	// Internal properties
	isHidden?: boolean;
	isStaticDirty?: boolean;
	staticNode?: DOMElement;
	// Tracks the previous commit's `staticNode` so the reconciler can detect identity changes (mount, unmount, key-driven remount) and reset `fullStaticOutput`.
	previousStaticNode?: DOMElement;
	onComputeLayout?: () => void;
	onRender?: () => void;
	onImmediateRender?: () => void;
	onStaticChange?: () => void;
	internal_layoutListeners?: Set<LayoutListener>;
} & InkNode;

export type TextNode = {
	nodeName: TextName;
	nodeValue: string;
} & InkNode;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type DOMNode<T = {nodeName: NodeNames}> = T extends {
	nodeName: infer U;
}
	? U extends '#text'
		? TextNode
		: DOMElement
	: never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type DOMNodeAttribute = boolean | string | number;

export const createNode = (nodeName: ElementNames): DOMElement => {
	const node: DOMElement = {
		nodeName,
		style: {},
		attributes: {},
		childNodes: [],
		parentNode: undefined,
		yogaNode: nodeName === 'ink-virtual-text' ? undefined : Yoga.Node.create(),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		internal_accessibility: {},
	};

	if (nodeName === 'ink-text') {
		node.yogaNode?.setMeasureFunc(measureTextNode.bind(null, node));
	}

	return node;
};

export const appendChildNode = (
	node: DOMElement,
	childNode: DOMElement,
): void => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;
	node.childNodes.push(childNode);

	if (childNode.yogaNode) {
		node.yogaNode?.insertChild(
			childNode.yogaNode,
			node.yogaNode.getChildCount(),
		);
	}

	if (node.nodeName === 'ink-text' || node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}
};

export const insertBeforeNode = (
	node: DOMElement,
	newChildNode: DOMNode,
	beforeChildNode: DOMNode,
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
	} else {
		node.childNodes.push(newChildNode);

		if (newChildNode.yogaNode) {
			node.yogaNode?.insertChild(
				newChildNode.yogaNode,
				node.yogaNode.getChildCount(),
			);
		}
	}

	if (node.nodeName === 'ink-text' || node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}
};

export const removeChildNode = (
	node: DOMElement,
	removeNode: DOMNode,
): void => {
	if (removeNode.yogaNode) {
		removeNode.parentNode?.yogaNode?.removeChild(removeNode.yogaNode);
	}

	removeNode.parentNode = undefined;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}

	if (node.nodeName === 'ink-text' || node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}
};

const nullifyYogaNodes = (node: DOMNode): void => {
	node.yogaNode = undefined;

	if (node.nodeName !== '#text') {
		for (const childNode of node.childNodes) {
			nullifyYogaNodes(childNode);
		}
	}
};

/**
Free the Yoga (WASM) memory of a removed subtree, then drop the `yogaNode`
reference on every DOM node within it.

`freeRecursive()` releases the WASM memory but leaves each JS wrapper object
truthy, so every `?.yogaNode` guard in the codebase would still pass and then
trap on a use-after-free when the wrapper is dereferenced (see
QwenLM/qwen-code#6820). Nulling the references makes those guards effective and
turns any lingering access into a safe no-op.
*/
export const freeYogaSubtree = (removeNode: DOMNode): void => {
	removeNode.yogaNode?.unsetMeasureFunc();
	removeNode.yogaNode?.freeRecursive();
	nullifyYogaNodes(removeNode);
};

export const setAttribute = (
	node: DOMElement,
	key: string,
	value: DOMNodeAttribute,
): void => {
	if (key === 'internal_accessibility') {
		node.internal_accessibility = value as DOMElement['internal_accessibility'];
		return;
	}

	node.attributes[key] = value;
};

/**
Update a text transform and invalidate measurements that include its output.
*/
export const setTransform = (
	node: DOMElement,
	transform: OutputTransformer | undefined,
): void => {
	node.internal_transform = transform;

	// Nested transforms contribute to the enclosing text node's measured content.
	if (node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}
};

export const setStyle = (node: DOMNode, style?: Styles): void => {
	if (node.nodeName === 'ink-text' && node.style.textWrap !== style?.textWrap) {
		// Wrapping changes text measurements without changing any Yoga style.
		node.yogaNode?.markDirty();
	}

	// Rendering code assumes style is always an object.
	node.style = style ?? {};
};

export const createTextNode = (text: string): TextNode => {
	const node: TextNode = {
		nodeName: '#text',
		nodeValue: text,
		yogaNode: undefined,
		parentNode: undefined,
		style: {},
	};

	setTextNodeValue(node, text);

	return node;
};

const measureTextNode = function (
	node: DOMNode,
	width: number,
	widthMode: MeasureMode,
): {width: number; height: number} {
	const text =
		node.nodeName === '#text' ? node.nodeValue : squashTextNodes(node);

	const dimensions = measureText(text);

	// An unconstrained Yoga measurement requests the natural size, not wrapping or truncation at its NaN width.
	// Text fits into container, no need to wrap
	if (widthMode === Yoga.MEASURE_MODE_UNDEFINED || dimensions.width <= width) {
		return dimensions;
	}

	// This is happening when <Box> is shrinking child nodes and Yoga asks
	// if we can fit this text node in a <1px space, so we just tell Yoga "no"
	if (dimensions.width >= 1 && width > 0 && width < 1) {
		return dimensions;
	}

	const textWrap = node.style?.textWrap ?? 'wrap';
	const wrappedText = wrapText(text, width, textWrap);
	const wrappedDimensions = measureText(wrappedText);

	// Reserve the truncation width so rendering does not truncate again at a narrower width when a wide character leaves an unused column.
	if (textWrap.startsWith('truncate')) {
		return {width, height: wrappedDimensions.height};
	}

	return wrappedDimensions;
};

const findClosestYogaNode = (node?: DOMNode): YogaNode | undefined => {
	if (!node?.parentNode) {
		return undefined;
	}

	return node.yogaNode ?? findClosestYogaNode(node.parentNode);
};

const markNodeAsDirty = (node?: DOMNode): void => {
	// Mark closest Yoga node as dirty to measure text dimensions again
	const yogaNode = findClosestYogaNode(node);
	yogaNode?.markDirty();
};

export const setNodeHidden = (node: DOMElement, isHidden: boolean): void => {
	node.isHidden = isHidden;
	node.yogaNode?.setDisplay(
		isHidden || node.style.display === 'none'
			? Yoga.DISPLAY_NONE
			: Yoga.DISPLAY_FLEX,
	);

	if (node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}
};

export const setTextNodeValue = (node: TextNode, text: string): void => {
	if (typeof text !== 'string') {
		text = String(text);
	}

	node.nodeValue = text;
	markNodeAsDirty(node);
};

export const addLayoutListener = (
	rootNode: DOMElement,
	listener: LayoutListener,
): (() => void) => {
	if (rootNode.nodeName !== 'ink-root') {
		return () => {};
	}

	rootNode.internal_layoutListeners ??= new Set();
	rootNode.internal_layoutListeners.add(listener);

	return () => {
		rootNode.internal_layoutListeners?.delete(listener);
	};
};

export const emitLayoutListeners = (rootNode: DOMElement): void => {
	if (rootNode.nodeName !== 'ink-root' || !rootNode.internal_layoutListeners) {
		return;
	}

	for (const listener of rootNode.internal_layoutListeners) {
		listener();
	}
};
