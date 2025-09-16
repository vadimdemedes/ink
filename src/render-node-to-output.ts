import widestLine from 'widest-line';
import indentString from 'indent-string';
import Yoga from 'yoga-layout';
import wrapText from './wrap-text.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import {type DOMElement} from './dom.js';
import {getScrollHeight, getScrollWidth} from './measure-element.js';
import type Output from './output.js';
import colorize from './colorize.js';

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

export type OutputTransformer = (s: string, index: number) => string;

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
	},
) => {
	const {
		offsetX = 0,
		offsetY = 0,
		transformers = [],
		skipStaticElements,
	} = options;

	if (skipStaticElements && node.internal_static) {
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
		let childrenOffsetY = y;
		let childrenOffsetX = x;
		let verticallyScrollable = false;
		let horizontallyScrollable = false;
		let isVerticalScrollbarVisible = false;

		if (node.nodeName === 'ink-box') {
			renderBackground(x, y, node, output);
			renderBorder(x, y, node, output);

			const overflow = node.style.overflow ?? 'visible';
			const overflowX = node.style.overflowX ?? overflow;
			const overflowY = node.style.overflowY ?? overflow;

			verticallyScrollable = overflowY === 'scroll';
			horizontallyScrollable = overflowX === 'scroll';

			if (verticallyScrollable) {
				calculateVerticalScroll(node);
				childrenOffsetY -= node.internal_scrollTop ?? 0;
			}

			if (horizontallyScrollable) {
				calculateHorizontalScroll(node);
				childrenOffsetX -= node.internal_scrollLeft ?? 0;
			}

			isVerticalScrollbarVisible =
				verticallyScrollable &&
				(node.internal_scrollHeight ?? 0) > (node.internal_clientHeight ?? 0);

			const clipHorizontally = overflowX === 'hidden' || overflowX === 'scroll';
			const clipVertically = overflowY === 'hidden' || overflowY === 'scroll';

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
					offsetX: childrenOffsetX,
					offsetY: childrenOffsetY,
					transformers: newTransformers,
					skipStaticElements,
				});
			}

			if (clipped) {
				output.unclip();
			}

			if (node.nodeName === 'ink-box') {
				if (verticallyScrollable) {
					renderVerticalScrollbar(node, x, y, output);
				}

				if (horizontallyScrollable) {
					renderHorizontalScrollbar(node, x, y, output, {
						verticallyScrollable: isVerticalScrollbarVisible,
					});
				}
			}
		}
	}
};

function calculateVerticalScroll(node: DOMElement) {
	const {yogaNode} = node;
	if (!yogaNode) {
		return;
	}

	const clientHeight =
		yogaNode.getComputedHeight() -
		yogaNode.getComputedBorder(Yoga.EDGE_TOP) -
		yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	const scrollHeight = getScrollHeight(node);
	const scrollTop = Math.max(
		0,
		Math.min(node.style.scrollTop ?? 0, scrollHeight - clientHeight),
	);

	node.internal_scrollTop = scrollTop;
	node.internal_scrollHeight = scrollHeight;
	node.internal_clientHeight = clientHeight;
}

function calculateHorizontalScroll(node: DOMElement) {
	const {yogaNode} = node;
	if (!yogaNode) {
		return;
	}

	const clientWidth =
		yogaNode.getComputedWidth() -
		yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);

	const scrollWidth = getScrollWidth(node);
	let scrollLeft = node.style.scrollLeft ?? 0;
	scrollLeft = Math.max(0, Math.min(scrollLeft, scrollWidth - clientWidth));

	node.internal_scrollLeft = scrollLeft;
	node.internal_scrollWidth = scrollWidth;
	node.internal_clientWidth = clientWidth;
}

function renderScrollbar(
	node: DOMElement,
	x: number,
	y: number,
	output: Output,
	axis: 'vertical' | 'horizontal',
	options: {
		verticallyScrollable?: boolean;
	} = {},
) {
	const {yogaNode} = node;
	if (!yogaNode) {
		return;
	}

	const clientDimension =
		axis === 'vertical'
			? (node.internal_clientHeight ?? 0)
			: (node.internal_clientWidth ?? 0);

	const scrollDimension =
		axis === 'vertical'
			? (node.internal_scrollHeight ?? 0)
			: (node.internal_scrollWidth ?? 0);

	const scrollPosition =
		axis === 'vertical'
			? (node.internal_scrollTop ?? 0)
			: (node.internal_scrollLeft ?? 0);

	if (scrollDimension <= clientDimension) {
		return;
	}

	const scrollbarX =
		axis === 'vertical'
			? x +
				yogaNode.getComputedWidth() -
				1 -
				yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
			: x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT);

	const scrollbarY =
		axis === 'vertical'
			? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
			: y +
				yogaNode.getComputedHeight() -
				1 -
				yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	const scrollbarDimension =
		axis === 'vertical'
			? yogaNode.getComputedHeight() -
				yogaNode.getComputedBorder(Yoga.EDGE_TOP) -
				yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM)
			: yogaNode.getComputedWidth() -
				yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
				yogaNode.getComputedBorder(Yoga.EDGE_RIGHT) -
				(options.verticallyScrollable ? 1 : 0);

	if (scrollbarDimension <= 0) {
		return;
	}

	const scrollbarDimensionHalves = scrollbarDimension * 2;

	const thumbDimensionHalves = Math.max(
		axis === 'vertical' ? 2 : 1,
		Math.round((clientDimension / scrollDimension) * scrollbarDimensionHalves),
	);

	const maxScrollPosition = scrollDimension - clientDimension;
	const maxThumbPosition = scrollbarDimensionHalves - thumbDimensionHalves;

	const thumbPosition =
		maxScrollPosition > 0
			? Math.round((scrollPosition / maxScrollPosition) * maxThumbPosition)
			: 0;

	const thumbColor = node.style.scrollbarThumbColor;

	const thumbStartHalf = thumbPosition;
	const thumbEndHalf = thumbPosition + thumbDimensionHalves;

	const startIndex = Math.floor(thumbStartHalf / 2);
	const endIndex = Math.min(scrollbarDimension, Math.ceil(thumbEndHalf / 2));

	for (let index = startIndex; index < endIndex; index++) {
		const cellStartHalf = index * 2;
		const cellEndHalf = (index + 1) * 2;

		const start = Math.max(cellStartHalf, thumbStartHalf);
		const end = Math.min(cellEndHalf, thumbEndHalf);

		const fill = end - start;

		if (fill > 0) {
			const char =
				axis === 'vertical'
					? fill === 2
						? '█'
						: // Fill === 1
							start % 2 === 0
							? '▀' // Top half of the cell is filled
							: '▄' // Bottom half of the cell is filled
					: fill === 2
						? '█'
						: // Fill === 1
							start % 2 === 0
							? '▌' // Left half of the cell is filled
							: '▐'; // Right half of the cell is filled

			const outputX = axis === 'vertical' ? scrollbarX : scrollbarX + index;
			const outputY = axis === 'vertical' ? scrollbarY + index : scrollbarY;

			output.write(
				outputX,
				outputY,
				colorize(
					colorize(char, thumbColor, 'foreground'),
					node.style.backgroundColor,
					'background',
				),
				{transformers: []},
			);
		}
	}
}

function renderVerticalScrollbar(
	node: DOMElement,
	x: number,
	y: number,
	output: Output,
) {
	renderScrollbar(node, x, y, output, 'vertical');
}

// eslint-disable-next-line max-params
function renderHorizontalScrollbar(
	node: DOMElement,
	x: number,
	y: number,
	output: Output,
	{verticallyScrollable}: {verticallyScrollable: boolean},
) {
	renderScrollbar(node, x, y, output, 'horizontal', {
		verticallyScrollable,
	});
}

export default renderNodeToOutput;
