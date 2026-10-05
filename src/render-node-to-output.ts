import stringWidth from 'string-width';
import widestLine from 'widest-line';
import indentString from 'indent-string';
import Yoga from 'yoga-layout';
import ansiEscapes from 'ansi-escapes';
import wrapText from './wrap-text.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import {type DOMElement} from './dom.js';
import type Output from './output.js';
import {type CursorPosition} from './cursor-helpers.js';
import {iterateAnsiGraphemes} from './string-utils.js';
import {type Styles} from './styles.js';
import {type AnsiToken} from './ansi-tokenizer.js';

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
				const position = locateAndWrapCursor({
					text: originalText,
					wrappedText: text,
					cursorOffset,
					maxWidth,
					textWrap,
				});

				if (position !== undefined) {
					const {x: newX, y: newY} = position;
					effects = {
						cursorPosition: {x: x + newX, y: y + newY},
					};
				}
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

const getAnsiCursorToken = (linkString: string) => {
	const firstItem = iterateAnsiGraphemes(linkString).next();
	if (firstItem.done === true) {
		throw new Error('No ansi found in link string?');
	}

	return firstItem.value.token.value;
};

const locateAndWrapCursor = ({
	text,
	wrappedText,
	cursorOffset,
	maxWidth,
	textWrap,
}: {
	text: string;
	wrappedText: string;
	cursorOffset: number;
	maxWidth: number;
	textWrap: Styles['textWrap'];
}): CursorPosition | undefined => {
	if (cursorOffset === 0 && maxWidth === 0) {
		return;
	}

	if (cursorOffset === 0) {
		return {x: 0, y: 0};
	}

	// Step 1: find the byte offset of the cursor and the
	// length (in bytes) of the grapheme at that offset
	let byteOffset = 0;
	let graphemeLength: undefined | number;
	for (const {token} of iterateAnsiGraphemes(text)) {
		if (token.type === 'grapheme' && --cursorOffset < 0) {
			graphemeLength = token.value.length;
			break;
		}

		byteOffset += token.value.length;
	}

	if (graphemeLength === undefined) {
		if (cursorOffset === 0) {
			// Cursor is at the very end of the input
			return getPositionWhen(wrappedText, () => false);
		}

		// Cursor is somehow past the input?
		return undefined;
	}

	// Step 2: Wrap the grapheme we found in a special Ansi
	// escape sequence so we can locate after wrapping
	const toSearch = ansiEscapes.link(
		text.slice(byteOffset, byteOffset + graphemeLength),
		'ink://cursor',
	);
	const toWrap =
		text.slice(0, byteOffset) +
		toSearch +
		text.slice(byteOffset + graphemeLength);
	const wrapped = wrapText(toWrap, maxWidth, textWrap);

	// TODO: What if the cursor is within an ellipses?

	const valueToFind = getAnsiCursorToken(toSearch);
	const {x, y, found} = getPositionWhen(
		wrapped,
		token =>
			// Console.error(
			// 	'hip',
			// 	JSON.stringify(token.value),
			// 	'vs',
			// 	JSON.stringify(valueToFind),
			// 	token.value === valueToFind,
			// );
			token.value === valueToFind,
	);

	return found ? {x, y} : undefined;
};

const getPositionWhen = (
	text: string,
	isTokenMatched: (
		token: AnsiToken | {type: 'grapheme'; value: string},
	) => boolean,
) => {
	let x = 0;
	let y = 0;
	for (const {token} of iterateAnsiGraphemes(text)) {
		if (isTokenMatched(token)) {
			return {x, y, found: true};
		}

		if (token.value === '\n') {
			x = 0;
			++y;
			continue;
		}

		if (token.type === 'grapheme') {
			x += stringWidth(token.value);
		}
	}

	return {x, y, found: false};
};

export default renderNodeToOutput;
