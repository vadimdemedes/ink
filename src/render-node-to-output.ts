import widestLine from 'widest-line';
import indentString from 'indent-string';
import Yoga from 'yoga-layout';
import wrapText from './wrap-text.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import {type DOMElement} from './dom.js';
import type Output from './output.js';
import {getAbsoluteContentPosition} from './layout.js';

// If parent container is `<Box>`, text nodes will be treated as separate nodes in
// the tree and will have their own coordinates in the layout.
// To ensure text nodes are aligned correctly, take X and Y of the first text node
// and use it as offset for the rest of the nodes
// Only first node is taken into account, because other text nodes can't have margin or padding,
// so their coordinates will be relative to the first node anyway
const applyPaddingToText = (node: DOMElement, text: string): string => {
	const yogaNode = node.childNodes[0]?.yogaNode;

	if (yogaNode) {
		const offsetX = yogaNode.getComputedLeft();
		const offsetY = yogaNode.getComputedTop();
		text = '\n'.repeat(offsetY) + indentString(text, offsetX);
	}

	return text;
};

const findRootNode = (node: DOMElement): DOMElement => {
	let currentNode = node;

	while (currentNode.parentNode) {
		currentNode = currentNode.parentNode;
	}

	return currentNode;
};

const findNodeByReference = (
	node: DOMElement,
	reference: unknown,
): DOMElement | undefined => {
	if (node.internal_ref === reference) {
		return node;
	}

	for (const childNode of node.childNodes) {
		if (childNode.nodeName === '#text') {
			continue;
		}

		const matchedNode = findNodeByReference(childNode, reference);
		if (matchedNode) {
			return matchedNode;
		}
	}

	return undefined;
};

const isNodeHidden = (node: DOMElement): boolean =>
	(node.internal_hidden ?? false) ||
	node.yogaNode?.getDisplay() === Yoga.DISPLAY_NONE;

const isNodeOrAncestorHidden = (node: DOMElement): boolean => {
	let currentNode: DOMElement | undefined = node;

	while (currentNode) {
		if (isNodeHidden(currentNode)) {
			return true;
		}

		currentNode = currentNode.parentNode;
	}

	return false;
};

export type OutputTransformer = (s: string, index: number) => string;

export type CursorOutputPosition = {
	x: number;
	y: number;
};

export type RenderState = {
	cursorRequested: boolean;
	cursorPosition: CursorOutputPosition | undefined;
};

export const renderNodeToScreenReaderOutput = (
	node: DOMElement,
	options: {
		parentRole?: string;
		skipStaticElements?: boolean;
	} = {},
): string => {
	if (options.skipStaticElements && node.internal_static) {
		return '';
	}

	if (node.internal_hidden) {
		return '';
	}

	if (node.yogaNode?.getDisplay() === Yoga.DISPLAY_NONE) {
		return '';
	}

	let output = '';

	if (node.nodeName === 'ink-text') {
		output = squashTextNodes(node);
	} else if (node.nodeName === 'ink-box' || node.nodeName === 'ink-root') {
		const separator =
			node.style.flexDirection === 'row' ||
			node.style.flexDirection === 'row-reverse'
				? ' '
				: '\n';

		const childNodes =
			node.style.flexDirection === 'row-reverse' ||
			node.style.flexDirection === 'column-reverse'
				? [...node.childNodes].reverse()
				: [...node.childNodes];

		output = childNodes
			.map(childNode => {
				const screenReaderOutput = renderNodeToScreenReaderOutput(
					childNode as DOMElement,
					{
						parentRole: node.internal_accessibility?.role,
						skipStaticElements: options.skipStaticElements,
					},
				);
				return screenReaderOutput;
			})
			.filter(Boolean)
			.join(separator);
	}

	if (node.internal_accessibility) {
		const {role, state} = node.internal_accessibility;

		if (state) {
			const stateKeys = Object.keys(state) as Array<keyof typeof state>;
			const stateDescription = stateKeys.filter(key => state[key]).join(', ');

			if (stateDescription) {
				output = `(${stateDescription}) ${output}`;
			}
		}

		if (role && role !== options.parentRole) {
			output = `${role}: ${output}`;
		}
	}

	return output;
};

// After nodes are laid out, render each to output object, which later gets rendered to terminal
const renderNodeToOutput = (
	node: DOMElement,
	output: Output,
	options: {
		offsetX?: number;
		offsetY?: number;
		transformers?: OutputTransformer[];
		skipStaticElements: boolean;
		renderState?: RenderState;
	},
) => {
	const {
		offsetX = 0,
		offsetY = 0,
		transformers = [],
		skipStaticElements,
		renderState,
	} = options;

	if (skipStaticElements && node.internal_static) {
		return;
	}

	if (node.internal_hidden) {
		return;
	}

	if (node.nodeName === 'ink-cursor') {
		if (!renderState) {
			return;
		}

		renderState.cursorRequested = true;

		const marker = node.internal_cursor;
		if (!marker) {
			renderState.cursorPosition = undefined;
			return;
		}

		const anchorNode =
			marker.anchorRef?.current ??
			(marker.anchorRef
				? findNodeByReference(findRootNode(node), marker.anchorRef)
				: undefined);
		const resolvedAnchorNode = marker.anchorRef ? anchorNode : node.parentNode;
		if (!resolvedAnchorNode) {
			renderState.cursorPosition = undefined;
			return;
		}

		if (marker.anchorRef && isNodeOrAncestorHidden(resolvedAnchorNode)) {
			renderState.cursorPosition = undefined;
			return;
		}

		const anchorPosition = getAbsoluteContentPosition(resolvedAnchorNode);
		if (!anchorPosition) {
			renderState.cursorPosition = undefined;
			return;
		}

		renderState.cursorPosition = {
			x: anchorPosition.x + marker.x,
			y: anchorPosition.y + marker.y,
		};
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

		if (typeof node.internal_transform === 'function') {
			newTransformers = [node.internal_transform, ...transformers];
		}

		if (node.nodeName === 'ink-text') {
			let text = squashTextNodes(node);

			if (text.length > 0) {
				const currentWidth = widestLine(text);
				const maxWidth = getMaxWidth(yogaNode);

				if (currentWidth > maxWidth) {
					const textWrap = node.style.textWrap ?? 'wrap';
					text = wrapText(text, maxWidth, textWrap);
				}

				text = applyPaddingToText(node, text);

				output.write(x, y, text, {transformers: newTransformers});
			}

			return;
		}

		let clipped = false;

		if (node.nodeName === 'ink-box') {
			renderBackground(x, y, node, output);
			renderBorder(x, y, node, output);

			const clipHorizontally =
				node.style.overflowX === 'hidden' || node.style.overflow === 'hidden';
			const clipVertically =
				node.style.overflowY === 'hidden' || node.style.overflow === 'hidden';

			if (clipHorizontally || clipVertically) {
				const x1 = clipHorizontally
					? x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT)
					: undefined;

				const x2 = clipHorizontally
					? x +
						yogaNode.getComputedWidth() -
						yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
					: undefined;

				const y1 = clipVertically
					? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
					: undefined;

				const y2 = clipVertically
					? y +
						yogaNode.getComputedHeight() -
						yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM)
					: undefined;

				output.clip({x1, x2, y1, y2});
				clipped = true;
			}
		}

		if (node.nodeName === 'ink-root' || node.nodeName === 'ink-box') {
			for (const childNode of node.childNodes) {
				renderNodeToOutput(childNode as DOMElement, output, {
					offsetX: x,
					offsetY: y,
					transformers: newTransformers,
					skipStaticElements,
					renderState,
				});
			}

			if (clipped) {
				output.unclip();
			}
		}
	}
};

export default renderNodeToOutput;
