import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';
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
import {type CursorPosition} from './cursor-helpers.js';
import {countOfCharIn} from './string-utils.js';

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

// Content offsets end up as terminal cell coordinates, so they have to be whole numbers. Fractions would drop or duplicate cells and non-finite values would erase content entirely.
const normalizeContentOffset = (value: number | undefined): number =>
	typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;

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
		output = squashTextNodes(node).text;
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

export type RenderEffects = {
	cursorPosition?: CursorPosition;
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
): RenderEffects | undefined => {
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
			let {text, cursorOffset} = squashTextNodes(node);
			let cursorPosition: CursorPosition | undefined;

			if (text.length > 0) {
				const currentWidth = widestLine(text);
				const maxWidth = getMaxWidth(yogaNode);
				const originalText = text;

				if (currentWidth > maxWidth) {
					const textWrap = node.style.textWrap ?? 'wrap';
					text = wrapText(text, maxWidth, textWrap);
				}

				if (cursorOffset !== undefined) {
					const {x: newX, y: newY} = wrapCursorOffsetToPosition({
						originalText,
						wrappedText: text,
						cursorOffset,
					});
					cursorPosition = {x: x + newX, y: y + newY};
				}

				text = applyPaddingToText(node, text);

				output.write(x, y, text, {transformers: newTransformers});
			}

			return cursorPosition === undefined ? undefined : {cursorPosition};
		}

		let clipped = false;

		if (node.nodeName === 'ink-box') {
			renderBackground(x, y, node, output);
			renderBorder(x, y, node, output);

			const clipHorizontally =
				(node.style.overflowX ?? node.style.overflow) === 'hidden';
			const clipVertically =
				(node.style.overflowY ?? node.style.overflow) === 'hidden';

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

		let resultEffects: RenderEffects | undefined;
		if (node.nodeName === 'ink-root' || node.nodeName === 'ink-box') {
			for (const childNode of node.childNodes) {
				const effects = renderNodeToOutput(childNode as DOMElement, output, {
					offsetX: x - normalizeContentOffset(node.style.contentOffsetX),
					offsetY: y - normalizeContentOffset(node.style.contentOffsetY),
					transformers: newTransformers,
					skipStaticElements,
				});
				if (effects !== undefined) {
					resultEffects = effects;
				}
			}

			if (clipped) {
				output.unclip();
			}
		}

		return resultEffects;
	}

	return undefined;
};

const wrapCursorOffsetToPosition = ({
	originalText,
	wrappedText,
	cursorOffset,
}: {
	originalText: string;
	wrappedText: string;
	cursorOffset: number;
}) => {
	let x = cursorOffset;
	let y = 0;

	// Any newlines in originalText should be "consumed" when
	// counting cursor offsets; any others were introduced by
	// wrapping and should not be counted as part of cursorOffset
	let countableNewlines = countOfCharIn({
		text: originalText,
		char: '\n',
		end: cursorOffset,
	});

	let columnAdjustments = 0;
	let start = 0;
	for (const [i, ch] of [...stripAnsi(wrappedText)].entries()) {
		if (ch === '\n') {
			// Reset column adjustments; they apply to a previous line
			// on which the cursor will not sit
			columnAdjustments = 0;

			++y;

			if (countableNewlines-- > 0) {
				--x;
			}

			x -= i - start;
			start = i + 1;
		} else {
			const width = stringWidth(ch);
			if (width > 1) {
				// Wide characters (eg: CJK) occupy multiple cells but
				// a single offset; account for that extra cell here:
				columnAdjustments += width - 1;
			} else if (width === 0) {
				// A zero-width character consumes *zero* cells (of course)
				columnAdjustments -= 1;
			}
		}

		if (x <= 0) break;
	}

	return {x: x + columnAdjustments, y};
};

export default renderNodeToOutput;
