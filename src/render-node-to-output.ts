import Yoga from 'yoga-layout';
import {type StyledChar} from '@alcalzone/ansi-tokenize';
import {truncateStyledChars, wrapStyledChars} from './text-wrap.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import {type DOMElement} from './dom.js';
import type Output from './output.js';
import colorize from './colorize.js';
import {
	measureStyledChars,
	splitStyledCharsByNewline,
	toStyledCharacters,
} from './measure-text.js';

// If parent container is `<Box>`, text nodes will be treated as separate nodes in
// the tree and will have their own coordinates in the layout.
// To ensure text nodes are aligned correctly, take X and Y of the first text node
// and use it as offset for the rest of the nodes
// Only first node is taken into account, because other text nodes can't have margin or padding,
// so their coordinates will be relative to the first node anyway
const applyPaddingToStyledChars = (
	node: DOMElement,
	lines: StyledChar[][],
): StyledChar[][] => {
	const yogaNode = node.childNodes[0]?.yogaNode;

	if (yogaNode) {
		const offsetX = yogaNode.getComputedLeft();
		const offsetY = yogaNode.getComputedTop();

		const space: StyledChar = {
			type: 'char',
			value: ' ',
			fullWidth: false,
			styles: [],
		};

		const paddingLeft = Array.from({length: offsetX}).map(() => space);

		lines = lines.map(line => [...paddingLeft, ...line]);

		const paddingTop: StyledChar[][] = Array.from({length: offsetY}).map(
			() => [],
		);
		lines.unshift(...paddingTop);
	}

	return lines;
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

	if (node.internalStickyAlternate) {
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
		nodeToSkip?: DOMElement;
		isStickyRender?: boolean;
	},
) => {
	if (options.nodeToSkip === node) {
		return;
	}

	const {
		offsetX = 0,
		offsetY = 0,
		transformers = [],
		skipStaticElements,
		isStickyRender = false,
	} = options;

	if (skipStaticElements && node.internal_static) {
		return;
	}

	if (node.internalStickyAlternate && !isStickyRender) {
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

		const width = yogaNode.getComputedWidth();
		const height = yogaNode.getComputedHeight();
		const clip = output.getCurrentClip();

		if (clip) {
			const nodeLeft = x;
			const nodeRight = x + width;
			const nodeTop = y;
			const nodeBottom = y + height;

			const clipLeft = clip.x1 ?? -Infinity;
			const clipRight = clip.x2 ?? Infinity;
			const clipTop = clip.y1 ?? -Infinity;
			const clipBottom = clip.y2 ?? Infinity;

			const isVisible =
				nodeRight > clipLeft &&
				nodeLeft < clipRight &&
				nodeBottom > clipTop &&
				nodeTop < clipBottom;

			if (!isVisible) {
				return;
			}
		}

		// Transformers are functions that transform final text output of each component
		// See Output class for logic that applies transformers
		let newTransformers = transformers;
		if (typeof node.internal_transform === 'function') {
			newTransformers = [node.internal_transform, ...transformers];
		}

		if (node.nodeName === 'ink-text') {
			const styledChars = toStyledCharacters(squashTextNodes(node));

			if (styledChars.length > 0) {
				let lines: StyledChar[][] = [];
				const {width: currentWidth} = measureStyledChars(styledChars);
				const maxWidth = getMaxWidth(yogaNode);

				if (currentWidth > maxWidth) {
					const textWrap = node.style.textWrap ?? 'wrap';
					if (textWrap.startsWith('truncate')) {
						let position: 'start' | 'middle' | 'end' = 'end';
						if (textWrap === 'truncate-middle') {
							position = 'middle';
						} else if (textWrap === 'truncate-start') {
							position = 'start';
						}

						lines = [truncateStyledChars(styledChars, maxWidth, {position})];
					} else {
						lines = wrapStyledChars(styledChars, maxWidth);
					}
				} else {
					lines = splitStyledCharsByNewline(styledChars);
				}

				lines = applyPaddingToStyledChars(node, lines);

				for (const [index, line] of lines.entries()) {
					output.write(x, y + index, line, {
						transformers: newTransformers,
						lineIndex: index,
					});
				}
			}

			return;
		}

		let clipped = false;
		let childrenOffsetY = y;
		let childrenOffsetX = x;
		let verticallyScrollable = false;
		let horizontallyScrollable = false;
		let isVerticalScrollbarVisible = false;
		let activeStickyNode: DOMElement | undefined;
		let nextStickyNode: DOMElement | undefined;

		if (node.nodeName === 'ink-box') {
			renderBackground(x, y, node, output);
			renderBorder(x, y, node, output);

			const overflow = node.style.overflow ?? 'visible';
			const overflowX = node.style.overflowX ?? overflow;
			const overflowY = node.style.overflowY ?? overflow;

			verticallyScrollable = overflowY === 'scroll';
			horizontallyScrollable = overflowX === 'scroll';

			if (verticallyScrollable) {
				childrenOffsetY -= node.internal_scrollState?.scrollTop ?? 0;

				const stickyNodes = getStickyDescendants(node);

				if (stickyNodes.length > 0) {
					const scrollTop =
						(node.internal_scrollState?.scrollTop ?? 0) +
						yogaNode.getComputedBorder(Yoga.EDGE_TOP);
					let activeStickyNodeIndex = -1;

					for (const [index, stickyNode] of stickyNodes.entries()) {
						if (stickyNode.yogaNode) {
							const stickyNodeTop = getRelativeTop(stickyNode, node);
							if (stickyNodeTop < scrollTop) {
								const parent = stickyNode.parentNode!;
								if (parent?.yogaNode) {
									const parentTop = getRelativeTop(parent, node);
									const parentHeight = parent.yogaNode.getComputedHeight();
									if (parentTop + parentHeight > scrollTop) {
										activeStickyNode = stickyNode;
										activeStickyNodeIndex = index;
									}
								}
							}
						}
					}

					if (
						activeStickyNodeIndex !== -1 &&
						activeStickyNodeIndex + 1 < stickyNodes.length
					) {
						nextStickyNode = stickyNodes[activeStickyNodeIndex + 1];
					}
				}
			}

			if (horizontallyScrollable) {
				childrenOffsetX -= node.internal_scrollState?.scrollLeft ?? 0;
			}

			isVerticalScrollbarVisible =
				verticallyScrollable &&
				(node.internal_scrollState?.scrollHeight ?? 0) >
					(node.internal_scrollState?.clientHeight ?? 0);

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
					nodeToSkip: activeStickyNode,
					isStickyRender,
				});
			}

			if (activeStickyNode?.yogaNode) {
				const alternateStickyNode = activeStickyNode.childNodes.find(
					childNode => (childNode as DOMElement).internalStickyAlternate,
				) as DOMElement | undefined;

				const nodeToRender = alternateStickyNode ?? activeStickyNode;
				const nodeToRenderYogaNode = nodeToRender.yogaNode;

				if (!nodeToRenderYogaNode) {
					return;
				}

				const stickyYogaNode = activeStickyNode.yogaNode;
				const borderTop = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
				const scrollTop = node.internal_scrollState?.scrollTop ?? 0;

				const parent = activeStickyNode.parentNode!;
				const parentYogaNode = parent.yogaNode!;
				const parentTop = getRelativeTop(parent, node);
				const parentHeight = parentYogaNode.getComputedHeight();
				const parentBottom = parentTop + parentHeight;
				const stickyNodeHeight = nodeToRenderYogaNode.getComputedHeight();
				const maxStickyTop = y - scrollTop + parentBottom - stickyNodeHeight;

				const naturalStickyY =
					y - scrollTop + getRelativeTop(activeStickyNode, node);
				const stuckStickyY = y + borderTop;

				let finalStickyY = Math.min(
					Math.max(stuckStickyY, naturalStickyY),
					maxStickyTop,
				);

				if (nextStickyNode?.yogaNode) {
					const nextStickyNodeTop = getRelativeTop(nextStickyNode, node);
					const nextStickyNodeTopInViewport = y - scrollTop + nextStickyNodeTop;
					if (nextStickyNodeTopInViewport < finalStickyY + stickyNodeHeight) {
						finalStickyY = nextStickyNodeTopInViewport - stickyNodeHeight;
					}
				}

				let offsetX: number;
				let offsetY: number;

				if (nodeToRender === alternateStickyNode) {
					const parentAbsoluteX = x + getRelativeLeft(parent, node);
					const stickyNodeAbsoluteX =
						parentAbsoluteX + stickyYogaNode.getComputedLeft();
					offsetX = stickyNodeAbsoluteX;
					offsetY = finalStickyY;
				} else {
					const parentAbsoluteX = x + getRelativeLeft(parent, node);
					offsetX = parentAbsoluteX;
					offsetY = finalStickyY - stickyYogaNode.getComputedTop();
				}

				renderNodeToOutput(nodeToRender, output, {
					offsetX,
					offsetY,
					transformers: newTransformers,
					skipStaticElements,
					isStickyRender: true,
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

function getStickyDescendants(node: DOMElement): DOMElement[] {
	const stickyDescendants: DOMElement[] = [];

	for (const child of node.childNodes) {
		if (child.nodeName === '#text') {
			continue;
		}

		const domChild = child;

		if (domChild.internalStickyAlternate) {
			continue;
		}

		if (domChild.internalSticky) {
			stickyDescendants.push(domChild);
		} else {
			const overflow = domChild.style.overflow ?? 'visible';
			const overflowX = domChild.style.overflowX ?? overflow;
			const overflowY = domChild.style.overflowY ?? overflow;
			const isScrollable = overflowX === 'scroll' || overflowY === 'scroll';

			if (!isScrollable && domChild.childNodes) {
				stickyDescendants.push(...getStickyDescendants(domChild));
			}
		}
	}

	return stickyDescendants;
}

function getRelativeTop(node: DOMElement, ancestor: DOMElement): number {
	if (!node.yogaNode) {
		return 0;
	}

	let top = node.yogaNode.getComputedTop();
	let parent = node.parentNode;

	while (parent && parent !== ancestor) {
		if (parent.yogaNode) {
			top += parent.yogaNode.getComputedTop();

			if (parent.nodeName === 'ink-box') {
				const overflow = parent.style.overflow ?? 'visible';
				const overflowY = parent.style.overflowY ?? overflow;

				if (overflowY === 'scroll') {
					top -= parent.internal_scrollState?.scrollTop ?? 0;
				}
			}
		}

		parent = parent.parentNode;
	}

	return top;
}

function getRelativeLeft(node: DOMElement, ancestor: DOMElement): number {
	if (!node.yogaNode) {
		return 0;
	}

	let left = node.yogaNode.getComputedLeft();
	let parent = node.parentNode;

	while (parent && parent !== ancestor) {
		if (parent.yogaNode) {
			left += parent.yogaNode.getComputedLeft();

			if (parent.nodeName === 'ink-box') {
				const overflow = parent.style.overflow ?? 'visible';
				const overflowX = parent.style.overflowX ?? overflow;

				if (overflowX === 'scroll') {
					left -= parent.internal_scrollState?.scrollLeft ?? 0;
				}
			}
		}

		parent = parent.parentNode;
	}

	return left;
}

function renderScrollbar(
	node: DOMElement,
	output: Output,
	options: {
		x: number;
		y: number;
		axis: 'vertical' | 'horizontal';
		verticallyScrollable?: boolean;
	},
) {
	const {x, y, axis} = options;
	const {yogaNode} = node;
	if (!yogaNode) {
		return;
	}

	const clientDimension =
		axis === 'vertical'
			? (node.internal_scrollState?.clientHeight ?? 0)
			: (node.internal_scrollState?.clientWidth ?? 0);

	const scrollDimension =
		axis === 'vertical'
			? (node.internal_scrollState?.scrollHeight ?? 0)
			: (node.internal_scrollState?.scrollWidth ?? 0);

	const scrollPosition =
		axis === 'vertical'
			? (node.internal_scrollState?.scrollTop ?? 0)
			: (node.internal_scrollState?.scrollLeft ?? 0);

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

			output.write(outputX, outputY, colorize(char, thumbColor, 'foreground'), {
				transformers: [],
				preserveBackgroundColor: true,
			});
		}
	}
}

function renderVerticalScrollbar(
	node: DOMElement,
	x: number,
	y: number,
	output: Output,
) {
	renderScrollbar(node, output, {x, y, axis: 'vertical'});
}

// eslint-disable-next-line max-params
function renderHorizontalScrollbar(
	node: DOMElement,
	x: number,
	y: number,
	output: Output,
	{verticallyScrollable}: {verticallyScrollable: boolean},
) {
	renderScrollbar(node, output, {
		x,
		y,
		axis: 'horizontal',
		verticallyScrollable,
	});
}

export default renderNodeToOutput;
