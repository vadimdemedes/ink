import {stripVTControlCharacters} from 'node:util';
import stringWidth from 'string-width';
import widestLine from 'widest-line';
import indentString from 'indent-string';
import Yoga from 'yoga-layout';
import wrapText from './wrap-text.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import {type DOMElement} from './dom.js';
import {take} from './iterable-utils.js';
import type Output from './output.js';
import {type CursorPosition} from './cursor-helpers.js';
import {
	graphemeOffsetToByteOffset,
	iterateGraphemeSegments,
} from './string-utils.js';
import {type Styles} from './styles.js';

// If parent container is `<Box>`, text nodes will be treated as separate nodes in
// the tree and will have their own coordinates in the layout.
// To ensure text nodes are aligned correctly, take X and Y of the first text node
// and use it as offset for the rest of the nodes
// Only first node is taken into account, because other text nodes can't have margin or padding,
// so their coordinates will be relative to the first node anyway
const applyPaddingToText = (node: DOMElement, text: string): string => {
	const yogaNode = node.childNodes.at(0)?.yogaNode;

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
	if (
		Boolean(options.skipStaticElements && node.internal_static) ||
		node.yogaNode?.getDisplay() === Yoga.DISPLAY_NONE
	) {
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

			if (stateDescription !== '') {
				output = `(${stateDescription}) ${output}`;
			}
		}

		if (Boolean(role) && role !== options.parentRole) {
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

	if (!yogaNode || yogaNode.getDisplay() === Yoga.DISPLAY_NONE) {
		return;
	}

	// Left and top positions in Yoga are relative to their parent node
	const x = offsetX + yogaNode.getComputedLeft();
	const y = offsetY + yogaNode.getComputedTop();

	// Transformers are functions that transform final text output of each component
	// See Output class for logic that applies transformers
	const newTransformers =
		typeof node.internal_transform === 'function'
			? [node.internal_transform, ...transformers]
			: transformers;

	if (node.nodeName === 'ink-text') {
		let {text, cursorOffset} = squashTextNodes(node);
		let effects: RenderEffects | undefined;

		if (text.length > 0) {
			const currentWidth = widestLine(text);
			const maxWidth = getMaxWidth(yogaNode);
			const originalText = text;

			const textWrap = node.style.textWrap ?? 'wrap';
			if (currentWidth > maxWidth) {
				text = wrapText(text, maxWidth, textWrap);
			}

			if (cursorOffset !== undefined) {
				const {x: newX, y: newY} = textWrap.startsWith('truncate')
					? truncateCursorOffsetToPosition({
							originalText,
							cursorOffset,
							maxWidth,
							wrapType: textWrap,
						})
					: wrapCursorOffsetToPosition({
							originalText,
							wrappedText: text,
							cursorOffset,
						});

				effects = {
					cursorPosition: {x: x + newX, y: y + newY},
				};
			}

			text = applyPaddingToText(node, text);

			output.write(x, y, text, {
				transformers: newTransformers,
				effects,
			});
		} else if (cursorOffset !== undefined) {
			// If there's no text, we've encountered
			// a bare Cursor
			effects = {
				cursorPosition: {x, y},
			};
			// We still go ahead and write an empty
			// string with the Effects in case clipping
			// is at play
			output.write(x, y, '', {
				transformers: [],
				effects,
			});
		}

		return effects;
	}

	let isClipped = false;

	if (node.nodeName === 'ink-box') {
		renderBackground(x, y, node, output);
		renderBorder(x, y, node, output);

		const shouldClipHorizontally =
			(node.style.overflowX ?? node.style.overflow) === 'hidden';
		const shouldClipVertically =
			(node.style.overflowY ?? node.style.overflow) === 'hidden';

		if (shouldClipHorizontally || shouldClipVertically) {
			const x1 = shouldClipHorizontally
				? x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT)
				: undefined;

			const x2 = shouldClipHorizontally
				? x +
					yogaNode.getComputedWidth() -
					yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
				: undefined;

			const y1 = shouldClipVertically
				? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
				: undefined;

			const y2 = shouldClipVertically
				? y +
					yogaNode.getComputedHeight() -
					yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM)
				: undefined;

			output.clip({x1, x2, y1, y2});
			isClipped = true;
		}
	}

	if (!(node.nodeName === 'ink-root' || node.nodeName === 'ink-box')) {
		return;
	}

	let resultEffects: RenderEffects | undefined;
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

	if (isClipped) {
		output.unclip();
	}

	return resultEffects;
};

const truncateCursorOffsetToPosition = ({
	originalText,
	cursorOffset,
	maxWidth,
	wrapType,
}: {
	originalText: string;
	cursorOffset: number;
	maxWidth: number;
	wrapType: Styles['textWrap'];
}) => {
	if (maxWidth > 0 && maxWidth < 1) {
		maxWidth = 1;
	}

	const cleanText = stripVTControlCharacters(originalText);
	let lineIndex = 0;
	let lineStartIndex = 0;
	let cursorGraphemesInLine = cursorOffset;
	let graphemesInLine = 0;
	for (const {index, segment} of take(
		iterateGraphemeSegments(cleanText),
		cursorOffset,
	)) {
		++graphemesInLine;
		if (segment !== '\n') {
			continue;
		}

		cursorGraphemesInLine -= graphemesInLine;
		graphemesInLine = 0;
		++lineIndex;
		lineStartIndex = index + 1;
	}

	const lineEndIndex = cleanText.indexOf('\n', lineStartIndex);
	const currentLine = cleanText.slice(
		lineStartIndex,
		lineEndIndex === -1 ? cleanText.length : lineEndIndex,
	);
	const cursorByteOffset = graphemeOffsetToByteOffset(
		currentLine,
		cursorGraphemesInLine,
	);

	const lineWidth = stringWidth(currentLine);
	if (lineWidth <= maxWidth) {
		// Not truncated!
		return {
			x: stringWidth(currentLine.slice(0, cursorByteOffset)),
			y: lineIndex,
		};
	}

	if (maxWidth <= 0) {
		return {x: 0, y: lineIndex};
	}

	if (maxWidth === 1) {
		return {x: Math.min(1, cursorGraphemesInLine), y: lineIndex};
	}

	let position: 'end' | 'middle' | 'start' = 'end';
	if (wrapType === 'truncate-middle') {
		position = 'middle';
	} else if (wrapType === 'truncate-start') {
		position = 'start';
	}

	let half = 0;
	if (position === 'middle') {
		half = Math.min(Math.floor(maxWidth / 2), Math.max(0, maxWidth - 1));
	} else if (position === 'end') {
		half = Math.max(0, maxWidth - 1);
	}

	const prefixLength = half;
	const prefix = currentLine.slice(0, half);
	const suffixLength = maxWidth - half - 1;
	const suffix = currentLine.slice(lineWidth - suffixLength, lineWidth);

	const suffixStartInCurrentLine = currentLine.length - suffixLength;

	let x: number;
	if (cursorByteOffset <= prefixLength) {
		x = stringWidth(currentLine.slice(0, cursorByteOffset));
	} else if (cursorByteOffset < suffixStartInCurrentLine) {
		x = stringWidth(prefix);
	} else {
		const offsetInSuffix = cursorByteOffset - suffixStartInCurrentLine;
		const suffixBeforeCursor = suffix.slice(0, offsetInSuffix);
		x = stringWidth(prefix) + 1 + stringWidth(suffixBeforeCursor);
	}

	return {x, y: lineIndex};
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
	let x = 0;
	let y = 0;
	let consumable = cursorOffset;
	if (consumable <= 0) {
		// Easy case:
		return {x, y};
	}

	// Any newlines in originalText should be "consumed" when
	// counting cursor offsets; any others were introduced by
	// wrapping and should not be counted as part of cursorOffset
	let consumableNewlines = 0;
	for (const {segment} of take(
		iterateGraphemeSegments(stripVTControlCharacters(originalText)),
		consumable,
	)) {
		if (segment === '\n') {
			++consumableNewlines;
		}
	}

	const wrappedGraphemes = iterateGraphemeSegments(
		stripVTControlCharacters(wrappedText),
	);
	for (const {segment} of wrappedGraphemes) {
		// NOTE: If the cursor lands on a newline, it should wrap
		if (segment !== '\n' && consumable <= 0) {
			break;
		}

		if (segment === '\n') {
			x = 0;
			++y;

			if (consumableNewlines > 0) {
				--consumableNewlines;
				--consumable;
			}
		} else {
			--consumable;
			x += stringWidth(segment);
		}
	}

	return {x, y};
};

export default renderNodeToOutput;
