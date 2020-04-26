import Yoga from 'yoga-layout-prebuilt';
import widestLine from 'widest-line';
import {wrapText} from './wrap-text';
import {getMaxWidth} from './get-max-width';
import {DOMNode, DOMElement} from './dom';
import {Output} from './output';

const isAllTextNodes = (node: DOMNode): boolean => {
	if (node.nodeName === '#text') {
		return true;
	}

	if (node.nodeName === 'SPAN') {
		if (node.textContent) {
			return true;
		}

		if (Array.isArray(node.childNodes)) {
			return node.childNodes.every(isAllTextNodes);
		}
	}

	return false;
};

// Squashing text nodes allows to combine multiple text nodes into one and write
// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
// is actually 3 text nodes, which would result 3 writes to `Output`.
//
// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
const squashTextNodes = (node: DOMElement): string => {
	let text = '';
	if (node.childNodes.length > 0) {
		// If parent container is `<Box>`, text nodes will be treated as separate nodes in
		// the tree and will have their own coordinates in the layout.
		// To ensure text nodes are aligned correctly, take X and Y of the first text node
		// and use them as offset for the rest of the nodes
		// Only first node is taken into account, because other text nodes can't have margin or padding,
		// so their coordinates will be relative to the first node anyway
		const [{yogaNode}] = node.childNodes;
		if (yogaNode) {
			const offsetX = yogaNode.getComputedLeft();
			const offsetY = yogaNode.getComputedTop();

			text = '\n'.repeat(offsetY) + ' '.repeat(offsetX);

			for (const childNode of node.childNodes) {
				let nodeText = '';

				if (childNode.nodeName === '#text') {
					nodeText = childNode.nodeValue;
				} else {
					if (childNode.nodeName === 'SPAN') {
						nodeText = childNode.textContent ?? squashTextNodes(childNode);
					}

					// Since these text nodes are being concatenated, `Output` instance won't be able to
					// apply children transform, so we have to do it manually here for each text node
					if (typeof childNode.internal_transform === 'function') {
						nodeText = childNode.internal_transform(nodeText);
					}
				}

				text += nodeText;
			}
		}
	}

	return text;
};

export type OutputTransformer = (s: string) => string;

// After nodes are laid out, render each to output object, which later gets rendered to terminal
export const renderNodeToOutput = (
	node: DOMNode,
	output: Output,
	options: {
		offsetX?: number;
		offsetY?: number;
		transformers?: OutputTransformer[];
		skipStaticElements: boolean;
	}
) => {
	const {
		offsetX = 0,
		offsetY = 0,
		transformers = [],
		skipStaticElements
	} = options;

	if (skipStaticElements && node.unstable__static) {
		return;
	}

	const {yogaNode} = node;

	if (yogaNode) {
		if (yogaNode.getDisplay() === Yoga.DISPLAY_NONE) {
			return;
		}

		// Left and top positions in Yoga are relative to their parent node
		const x = offsetX + yogaNode.getComputedLeft();
		const y = offsetY + yogaNode.getComputedTop();

		// Transformers are functions that transform final text output of each component
		// See Output class for logic that applies transformers
		let newTransformers = transformers;

		// Text nodes
		if (node.nodeName === '#text') {
			output.write(x, y, node.nodeValue, {transformers: newTransformers});
			return;
		}

		if (typeof node.internal_transform === 'function') {
			newTransformers = [node.internal_transform, ...transformers];
		}

		// Nodes with only text inside
		if (node.textContent) {
			let text = node.textContent;

			// Since text nodes are always wrapped in an additional node, parent node
			// is where we should look for attributes
			if (node.parentNode) {
				const currentWidth = widestLine(text);
				const maxWidth = node.parentNode.yogaNode
					? getMaxWidth(node.parentNode.yogaNode)
					: 0;

				if (currentWidth > maxWidth) {
					const wrapType = node.parentNode.style.textWrap ?? 'wrap';
					text = wrapText(text, maxWidth, wrapType);
				}
			}

			output.write(x, y, text, {transformers: newTransformers});
			return;
		}

		const isFlexDirectionRow = node.style.flexDirection === 'row';

		if (isFlexDirectionRow && node.childNodes.every(isAllTextNodes)) {
			let text = squashTextNodes(node);
			const currentWidth = widestLine(text);
			const maxWidth = getMaxWidth(yogaNode);

			if (currentWidth > maxWidth) {
				const wrapType = node.style.textWrap ?? 'wrap';
				text = wrapText(text, maxWidth, wrapType);
			}

			output.write(x, y, text, {transformers: newTransformers});
			return;
		}

		// Nodes that have other nodes as children
		for (const childNode of node.childNodes) {
			renderNodeToOutput(childNode, output, {
				offsetX: x,
				offsetY: y,
				transformers: newTransformers,
				skipStaticElements
			});
		}
	}
};
