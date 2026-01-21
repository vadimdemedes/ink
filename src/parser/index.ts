import type {
	KeypressParser,
	GraphemeInfo,
	EscapeParseResult,
	EmitMetadata,
} from './types.js';
import {
	escape,
	zeroWidthJoiner,
	extendedPictographic,
	combiningMark,
	skinToneModifierStart,
	skinToneModifierEnd,
	variationSelector15,
	variationSelector16,
	extendedVariationSelectorStart,
	extendedVariationSelectorEnd,
	bracketedPasteStart,
	bracketedPasteEnd,
	maxCarrySize,
	maxPasteSize,
	csiParamByte,
	csiFinalByte,
	maxEscapeDepth,
	graphemeSegmenter,
} from './constants.js';

export type {
	KeypressParser,
	GraphemeInfo,
	EscapeParseResult,
	EmitMetadata,
} from './types.js';
export * from './constants.js';

const bmpMax = 0xff_ff; // Basic Multilingual Plane maximum

const codePointLength = (codePoint: number): number =>
	codePoint > bmpMax ? 2 : 1;

const zeroWidthJoinerCodePoint = zeroWidthJoiner.codePointAt(0)!;

const getNextGrapheme = (
	text: string,
	start: number,
): GraphemeInfo | undefined => {
	if (start >= text.length) {
		return undefined;
	}

	if (graphemeSegmenter) {
		const segments = graphemeSegmenter.segment(text.slice(start));
		const iteratorResult = segments[Symbol.iterator]().next();

		if (iteratorResult.done) {
			return undefined;
		}

		const {segment} = iteratorResult.value;
		return {segment, length: segment.length};
	}

	const codePoint = text.codePointAt(start);

	if (codePoint === undefined) {
		return undefined;
	}

	let length = codePointLength(codePoint);

	while (start + length < text.length) {
		const nextCodePoint = text.codePointAt(start + length);

		if (nextCodePoint === undefined) {
			break;
		}

		if (nextCodePoint === zeroWidthJoinerCodePoint) {
			const afterJoiner = text.codePointAt(
				start + length + codePointLength(nextCodePoint),
			);

			if (afterJoiner === undefined) {
				break;
			}

			length += codePointLength(nextCodePoint);
			length += codePointLength(afterJoiner);
			continue;
		}

		const nextChar = String.fromCodePoint(nextCodePoint);

		if (
			combiningMark.test(nextChar) ||
			(nextCodePoint >= skinToneModifierStart &&
				nextCodePoint <= skinToneModifierEnd) ||
			nextCodePoint === variationSelector15 ||
			nextCodePoint === variationSelector16 ||
			(nextCodePoint >= extendedVariationSelectorStart &&
				nextCodePoint <= extendedVariationSelectorEnd)
		) {
			length += codePointLength(nextCodePoint);
			continue;
		}

		break;
	}

	return {segment: text.slice(start, start + length), length};
};

const startsWithContinuationMark = (value: string): boolean => {
	if (!value) {
		return false;
	}

	const firstCodePoint = value.codePointAt(0);
	if (firstCodePoint === undefined) {
		return false;
	}

	// Check for ZWJ
	if (firstCodePoint === zeroWidthJoinerCodePoint) {
		return true;
	}

	// Check for variation selectors
	if (
		firstCodePoint === variationSelector15 ||
		firstCodePoint === variationSelector16 ||
		(firstCodePoint >= extendedVariationSelectorStart &&
			firstCodePoint <= extendedVariationSelectorEnd)
	) {
		return true;
	}

	// Check for skin tone modifiers
	if (
		firstCodePoint >= skinToneModifierStart &&
		firstCodePoint <= skinToneModifierEnd
	) {
		return true;
	}

	// Check for combining marks
	const firstChar = String.fromCodePoint(firstCodePoint);
	if (combiningMark.test(firstChar)) {
		return true;
	}

	return false;
};

const shouldHoldGraphemeForContinuation = (value: string): boolean => {
	if (!value) {
		return false;
	}

	if (value.endsWith(zeroWidthJoiner)) {
		return true;
	}

	if (extendedPictographic.test(value)) {
		return true;
	}

	// Hold all graphemes at chunk boundaries to handle combining marks,
	// variation selectors, and skin tone modifiers that may arrive in the next chunk
	return true;
};

/**
 * Creates a stateful keypress parser that transforms raw stdin chunks into complete keypresses.
 *
 * Handles:
 * - Split escape sequences across chunks (CSI, OSC, DCS, etc.)
 * - Bracketed paste mode (markers consumed, content marked with `isPaste` flag)
 * - Unicode grapheme clustering (emoji, ZWJ sequences, variation selectors, combining marks)
 * - Single-ESC ambiguity resolution using event loop timing
 *
 * @param emit - Callback invoked for each complete keypress or text chunk
 *   - First parameter: The sequence/text (escape sequences, graphemes, or pasted content)
 *   - Second parameter: Optional metadata (e.g., `{isPaste: true}` for pasted content)
 *
 * @returns Parser instance with:
 *   - `push(chunk)`: Feed raw input chunks to the parser
 *   - `reset()`: Clear all internal state and pending timers
 *
 * @example
 * ```typescript
 * const parser = createKeypressParser((sequence, metadata) => {
 *   if (metadata?.isPaste) {
 *     console.log('Pasted:', sequence);
 *   } else {
 *     console.log('Typed:', sequence);
 *   }
 * });
 *
 * stdin.on('data', chunk => parser.push(chunk));
 * ```
 */
export const createKeypressParser = (
	emit: (output: string, metadata?: EmitMetadata) => void,
): KeypressParser => {
	let carry = '';
	let carryMode: 'none' | 'escape' | 'grapheme' = 'none';
	let escapeImmediate: NodeJS.Immediate | undefined;
	let graphemeImmediate: NodeJS.Immediate | undefined;
	let pendingText = '';
	let inBracketedPaste = false;
	let bracketedBuffer = '';
	const escapeCodePoint = escape.codePointAt(0)!;

	const flushPendingText = (force = false) => {
		if (!pendingText) {
			return;
		}

		if (!force && pendingText.endsWith(zeroWidthJoiner)) {
			return;
		}

		emit(pendingText);
		pendingText = '';
	};

	const emitSequence = (sequence: string) => {
		flushPendingText(true);
		emit(sequence);
	};

	const cancelPendingEscape = () => {
		if (escapeImmediate) {
			clearImmediate(escapeImmediate);
			escapeImmediate = undefined;
		}
	};

	const cancelPendingGrapheme = () => {
		if (graphemeImmediate) {
			clearImmediate(graphemeImmediate);
			graphemeImmediate = undefined;
		}
	};

	const scheduleSingleEscapeDecision = () => {
		cancelPendingEscape();

		// Wait for two turns of the event loop: the first lets pending chunks append,
		// the second runs after same-tick data handlers so we don't beat fresh input.
		escapeImmediate = setImmediate(() => {
			escapeImmediate = setImmediate(() => {
				if (carry === escape) {
					carry = '';
					carryMode = 'none';
					emitSequence(escape);
				}

				escapeImmediate = undefined;
			});
		});
	};

	const schedulePendingGraphemeDecision = () => {
		cancelPendingGrapheme();

		if (carryMode !== 'grapheme' || !carry) {
			return;
		}

		graphemeImmediate = setImmediate(() => {
			if (carryMode === 'grapheme' && carry) {
				pendingText += carry;
				carry = '';
				carryMode = 'none';
				flushPendingText(true);
			}

			graphemeImmediate = undefined;
		});
	};

	const readEscapeSequence = (
		input: string,
		start: number,
		depth = 0,
	): EscapeParseResult => {
		if (depth >= maxEscapeDepth) {
			return {kind: 'invalid', length: 1};
		}

		if (start + 1 >= input.length) {
			return {kind: 'incomplete', length: input.length - start};
		}

		const next = input[start + 1]!;

		if (next === '[') {
			let index = start + 2;

			while (index < input.length) {
				const character = input[index]!;

				if (csiFinalByte.test(character)) {
					return {kind: 'complete', length: index - start + 1};
				}

				if (!csiParamByte.test(character)) {
					return {kind: 'invalid', length: 1};
				}

				index++;
			}

			return {kind: 'incomplete', length: input.length - start};
		}

		if (next === 'O') {
			let index = start + 2;

			while (index < input.length) {
				const character = input[index]!;

				if (csiFinalByte.test(character)) {
					return {kind: 'complete', length: index - start + 1};
				}

				if (!csiParamByte.test(character)) {
					return {kind: 'invalid', length: 1};
				}

				index++;
			}

			return {kind: 'incomplete', length: input.length - start};
		}

		if (next === escape) {
			const nested = readEscapeSequence(input, start + 1, depth + 1);

			if (nested.kind === 'invalid') {
				return nested;
			}

			if (nested.kind === 'incomplete') {
				return {kind: 'incomplete', length: input.length - start};
			}

			return {kind: 'complete', length: 1 + nested.length};
		}

		const grapheme = getNextGrapheme(input, start + 1);

		if (!grapheme) {
			return {kind: 'incomplete', length: input.length - start};
		}

		if (start + 1 + grapheme.length > input.length) {
			return {kind: 'incomplete', length: input.length - start};
		}

		if (
			grapheme.segment.endsWith(zeroWidthJoiner) &&
			start + 1 + grapheme.length >= input.length
		) {
			return {kind: 'incomplete', length: input.length - start};
		}

		return {kind: 'complete', length: 1 + grapheme.length};
	};

	const push = (chunk: string): void => {
		if (!chunk) {
			return;
		}

		cancelPendingEscape();
		cancelPendingGrapheme();

		let nextChunk = chunk;

		if (carryMode === 'grapheme') {
			if (startsWithContinuationMark(nextChunk)) {
				nextChunk = carry + nextChunk;
				carry = '';
				carryMode = 'none';
			} else {
				pendingText += carry;
				carry = '';
				carryMode = 'none';
				flushPendingText(true);
			}
		}

		if (carryMode === 'escape') {
			nextChunk = carry + nextChunk;
			carry = '';
			carryMode = 'none';
		}

		const input = nextChunk;

		let index = 0;

		while (index < input.length) {
			if (inBracketedPaste) {
				const endIndex = input.indexOf(bracketedPasteEnd, index);

				if (endIndex === -1) {
					bracketedBuffer += input.slice(index);

					// Prevent memory exhaustion from unbounded paste
					if (bracketedBuffer.length > maxPasteSize) {
						flushPendingText(true);
						emit(bracketedBuffer, {isPaste: true});
						bracketedBuffer = '';
						inBracketedPaste = false;
					}

					index = input.length;
					break;
				}

				bracketedBuffer += input.slice(index, endIndex);
				flushPendingText(true);
				emit(bracketedBuffer, {isPaste: true});
				bracketedBuffer = '';

				inBracketedPaste = false;
				index = endIndex + bracketedPasteEnd.length;
				continue;
			}

			const codePoint = input.codePointAt(index);

			if (codePoint === undefined) {
				break;
			}

			if (codePoint !== escapeCodePoint) {
				const grapheme = getNextGrapheme(input, index);

				if (!grapheme) {
					pendingText += input.slice(index);
					index = input.length;
					break;
				}

				const {segment, length} = grapheme;
				const atEnd = index + length >= input.length;

				if (atEnd && shouldHoldGraphemeForContinuation(segment)) {
					carry = input.slice(index);
					carryMode = 'grapheme';
					schedulePendingGraphemeDecision();
					break;
				}

				pendingText += segment;
				index += length;
				continue;
			}

			if (input.startsWith(bracketedPasteStart, index)) {
				flushPendingText(true);
				inBracketedPaste = true;
				bracketedBuffer = '';
				index += bracketedPasteStart.length;
				continue;
			}

			const remaining = input.length - index;

			if (remaining === 1) {
				carry = escape;
				carryMode = 'escape';
				scheduleSingleEscapeDecision();
				index = input.length;
				break;
			}

			const sequence = readEscapeSequence(input, index);

			if (sequence.kind === 'incomplete') {
				carry = input.slice(index);
				carryMode = 'escape';

				if (carry.length > maxCarrySize) {
					flushPendingText(true);
					emit(carry);
					carry = '';
					carryMode = 'none';
				}

				break;
			}

			if (sequence.kind === 'invalid') {
				emitSequence(escape);
				index += 1;
				continue;
			}

			const value = input.slice(index, index + sequence.length);
			emitSequence(value);
			index += sequence.length;
		}

		if (!inBracketedPaste && carryMode === 'none' && index >= input.length) {
			flushPendingText();
		}
	};

	const reset = (): void => {
		cancelPendingEscape();
		cancelPendingGrapheme();
		carry = '';
		carryMode = 'none';
		pendingText = '';
		inBracketedPaste = false;
		bracketedBuffer = '';
	};

	return {push, reset};
};
