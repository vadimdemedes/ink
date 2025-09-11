import widestLine from 'widest-line';
import indentString from 'indent-string';
import Yoga from 'yoga-layout';
import wrapText from './wrap-text.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import {type DOMElement, getScrollHeight, getScrollWidth} from './dom.js';
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

		if (node.nodeName === 'ink-box') {
			renderBackground(x, y, node, output);
			renderBorder(x, y, node, output);

			const overflow = node.style.overflow ?? 'visible';
			const overflowX = node.style.overflowX ?? overflow;
			const overflowY = node.style.overflowY ?? overflow;

			const verticallyScrollable = overflowY === 'scroll';
			const horizontallyScrollable = overflowX === 'scroll';

			if (verticallyScrollable) {
				renderVerticalScrollbar(node, x, y, output);
				childrenOffsetY -= node.internal_scrollTop ?? 0;
			}

			if (horizontallyScrollable) {
				renderHorizontalScrollbar(node, x, y, output);
				childrenOffsetX -= node.style.scrollLeft ?? 0;
			}

			const clipHorizontally = overflowX === 'hidden' || overflowX === 'scroll';
			const clipVertically = overflowY === 'hidden' || overflowY === 'scroll';

			if (clipHorizontally || clipVertically) {
				const x1 = clipHorizontally
					? x +
						yogaNode.getComputedBorder(Yoga.EDGE_LEFT) +
						yogaNode.getComputedPadding(Yoga.EDGE_LEFT)
					: undefined;

				const x2 = clipHorizontally
					? x +
						yogaNode.getComputedWidth() -
						yogaNode.getComputedBorder(Yoga.EDGE_RIGHT) -
						yogaNode.getComputedPadding(Yoga.EDGE_RIGHT) -
						(verticallyScrollable ? 1 : 0)
					: undefined;

				const y1 = clipVertically
					? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
					: undefined;

				const y2 = clipVertically
					? y +
						yogaNode.getComputedHeight() -
						yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM) -
						(horizontallyScrollable ? 1 : 0)
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
		}
	}
};

function renderVerticalScrollbar(
	node: DOMElement,
	x: number,
	y: number,
	output: Output,
) {
	const {yogaNode} = node;
	if (!yogaNode) {
		return;
	}

	const clientHeight =
		yogaNode.getComputedHeight() -
		yogaNode.getComputedBorder(Yoga.EDGE_TOP) -
		yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	const borderTop = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
	const borderBottom = yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);
	const scrollHeight = getScrollHeight(yogaNode);

	let {scrollTop} = node.style;
	if (typeof scrollTop !== 'number') {
		scrollTop =
			node.style.initialScrollPosition === 'bottom'
				? Math.max(0, scrollHeight - clientHeight)
				: 0;
	}

	scrollTop = Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight));

	node.internal_scrollTop = scrollTop;
	node.internal_scrollHeight = scrollHeight;
	node.internal_clientHeight = clientHeight;

	if (scrollHeight <= clientHeight) {
		return;
	}

	const scrollbarX =
		x +
		yogaNode.getComputedWidth() -
		1 -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);

	// Scrollbar track is rendered from border to border.
	const scrollbarY = y + yogaNode.getComputedBorder(Yoga.EDGE_TOP);
	const scrollbarHeight =
		yogaNode.getComputedHeight() - borderTop - borderBottom;

	// Thumb height is proportional to the visible content area.
	const thumbHeight = Math.max(
		1,
		Math.ceil((clientHeight / scrollHeight) * scrollbarHeight),
	);

	// Thumb moves within the scrollbar track.
	const thumbY =
		scrollbarHeight > thumbHeight
			? Math.floor(
					(scrollTop / (scrollHeight - clientHeight)) *
						(scrollbarHeight - thumbHeight),
				)
			: 0;

	const thumbCharacter = node.style.scrollbarThumbCharacter ?? '█';
	const trackCharacter = node.style.scrollbarTrackCharacter ?? '│';
	const thumbColor = node.style.scrollbarThumbColor ?? 'white';
	const trackColor = node.style.scrollbarTrackColor ?? 'gray';

	// Render track
	for (let index = 0; index < scrollbarHeight; index++) {
		output.write(
			scrollbarX,
			scrollbarY + index,
			colorize(trackCharacter, trackColor, 'foreground'),
			{transformers: []},
		);
	}

	// Render thumb
	for (let index = 0; index < thumbHeight; index++) {
		output.write(
			scrollbarX,
			scrollbarY + thumbY + index,
			colorize(thumbCharacter, thumbColor, 'foreground'),
			{transformers: []},
		);
	}
}

function renderHorizontalScrollbar(
	node: DOMElement,
	x: number,
	y: number,
	output: Output,
	{verticallyScrollable}: {verticallyScrollable: boolean},
) {
	const {yogaNode} = node;
	if (!yogaNode) {
		return;
	}

	const clientWidth =
		yogaNode.getComputedWidth() -
		yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);

	const scrollWidth = getScrollWidth(yogaNode);
	let scrollLeft = node.style.scrollLeft ?? 0;
	scrollLeft = Math.max(0, Math.min(scrollLeft, scrollWidth - clientWidth));

	if (scrollWidth <= clientWidth) {
		return;
	}

	const scrollbarY =
		y +
		yogaNode.getComputedHeight() -
		1 -
		yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	const scrollbarX = x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT);
	const scrollbarWidth =
		yogaNode.getComputedWidth() -
		yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT) -
		(verticallyScrollable ? 1 : 0);

	const thumbWidth = Math.max(
		1,
		Math.ceil((clientWidth / scrollWidth) * scrollbarWidth),
	);

	const thumbX =
		scrollbarWidth > thumbWidth
			? Math.floor(
					(scrollLeft / (scrollWidth - clientWidth)) *
						(scrollbarWidth - thumbWidth),
				)
			: 0;

	const thumbCharacter = node.style.scrollbarThumbCharacter ?? '█';
	const trackCharacter = node.style.scrollbarTrackCharacter ?? '─';
	const thumbColor = node.style.scrollbarThumbColor ?? 'white';
	const trackColor = node.style.scrollbarTrackColor ?? 'gray';

	// Render track
	for (let index = 0; index < scrollbarWidth; index++) {
		output.write(
			scrollbarX + index,
			scrollbarY,
			colorize(trackCharacter, trackColor, 'foreground'),
			{transformers: []},
		);
	}

	// Render thumb
	for (let index = 0; index < thumbWidth; index++) {
		output.write(
			scrollbarX + thumbX + index,
			scrollbarY,
			colorize(thumbCharacter, thumbColor, 'foreground'),
			{transformers: []},
		);
	}
}

export default renderNodeToOutput;
