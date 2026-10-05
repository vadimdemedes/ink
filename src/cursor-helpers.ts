import ansiEscapes from 'ansi-escapes';
import {stripVTControlCharacters} from 'node:util';
import {iterateAnsiGraphemes, iterateGraphemeSegments} from './string-utils.js';
import {AnsiToken} from './ansi-tokenizer.js';
import stringWidth from 'string-width';

export type CursorPosition = {
	x: number;
	y: number;
};

const showCursorEscape = '\u{1B}[?25h';
const hideCursorEscape = '\u{1B}[?25l';

export {showCursorEscape, hideCursorEscape};

/**
Compare two cursor positions. Returns true if they differ.
*/
// eslint-disable-next-line unicorn/consistent-boolean-name -- Exported helper that tests import by this name.
export const cursorPositionChanged = (
	a: CursorPosition | undefined,
	b: CursorPosition | undefined,
): boolean => a?.x !== b?.x || a?.y !== b?.y;

/**
Build escape sequence to move cursor from the bottom of the output to the target position and show it.

`bottomLine` is the row the renderer left the cursor on, counted from the top of the output.
That is always `lines.length - 1` for `lines = str.split('\n')`, whether or not the output ends
with a newline:

- With a trailing newline, `split` yields one extra empty element and the renderer stops just
  past the last visible line — which is `lines.length - 1`.
- Without one, there is no extra element and the renderer deliberately stops on the last visible
  line instead of moving past it — which is also `lines.length - 1`.

This is the same row basis `buildReturnToBottom` measures from, so the two stay in step.
*/
export const buildCursorSuffix = (
	bottomLine: number,
	cursorPosition: CursorPosition | undefined,
): string => {
	if (!cursorPosition) {
		return '';
	}

	const moveUp = bottomLine - cursorPosition.y;
	return (
		(moveUp > 0 ? ansiEscapes.cursorUp(moveUp) : '') +
		ansiEscapes.cursorTo(cursorPosition.x) +
		showCursorEscape
	);
};

/**
Build escape sequence to move cursor from previousCursorPosition back to the bottom of output.
This must be done before eraseLines or any operation that assumes cursor is at the bottom.
*/
export const buildReturnToBottom = (
	previousLineCount: number,
	previousCursorPosition: CursorPosition | undefined,
): string => {
	if (!previousCursorPosition) {
		return '';
	}

	// PreviousLineCount is the raw `split('\n')` length, so `previousLineCount - 1`
	// is the row the cursor was left on regardless of a trailing newline — the same
	// basis `buildCursorSuffix` takes as its `bottomLine`.
	const down = previousLineCount - 1 - previousCursorPosition.y;
	return (
		(down > 0 ? ansiEscapes.cursorDown(down) : '') + ansiEscapes.cursorTo(0)
	);
};

export type CursorOnlyInput = {
	cursorWasShown: boolean;
	previousLineCount: number;
	previousCursorPosition: CursorPosition | undefined;
	cursorPosition: CursorPosition | undefined;
};

/**
Build the escape sequence for cursor-only updates (output unchanged, cursor moved).
Hides cursor if it was previously shown, returns to bottom, then repositions.

`buildReturnToBottom` has just placed the cursor on row `previousLineCount - 1`, so the
suffix measures from there rather than recomputing the row from the output.
*/
export const buildCursorOnlySequence = (input: CursorOnlyInput): string => {
	const hidePrefix = input.cursorWasShown ? hideCursorEscape : '';
	const returnToBottom = buildReturnToBottom(
		input.previousLineCount,
		input.previousCursorPosition,
	);
	const cursorSuffix = buildCursorSuffix(
		input.previousLineCount - 1,
		input.cursorPosition,
	);
	return hidePrefix + returnToBottom + cursorSuffix;
};

/**
Build the prefix that hides cursor and returns to bottom before erasing or rewriting.
Returns empty string if cursor was not shown.
*/
export const buildReturnToBottomPrefix = (
	wasCursorShown: boolean,
	previousLineCount: number,
	previousCursorPosition: CursorPosition | undefined,
): string => {
	if (!wasCursorShown) {
		return '';
	}

	return (
		hideCursorEscape +
		buildReturnToBottom(previousLineCount, previousCursorPosition)
	);
};

/**
Build the sequence that erases the previous frame, as `clear` does before other output is written.

With a cursor shown, the frame's top row is found relative to the cursor instead of returning to the bottom first. A terminal shrinking its rows drops the rows below the cursor before scrolling anything, so the frame's bottom rows may be gone: moving down clamps at the last row and erasing upward from there reaches into the content above the frame.
*/
export const buildEraseFrame = (
	previousLineCount: number,
	previousCursorPosition: CursorPosition | undefined,
): string => {
	if (!previousCursorPosition) {
		return ansiEscapes.eraseLines(previousLineCount);
	}

	// `buildCursorSuffix` never moves below the bottom row, so a cursor set past the output sits on that row.
	const rowsBelowTop = Math.min(
		previousCursorPosition.y,
		previousLineCount - 1,
	);
	return (
		hideCursorEscape +
		ansiEscapes.cursorMove(0, -rowsBelowTop) +
		ansiEscapes.cursorTo(0) +
		ansiEscapes.eraseDown
	);
};

export class InlineCursorHelper {
	private text: string = '';
	private cursorIndex: number | undefined;
	private cursorAtEnd = false;

	private isTransformed = false;
	private textWithCursor: string | undefined;
	private cursorSequence: string | undefined;

	constructor() {}

	public get hasCursor() {
		return this.cursorAtEnd || this.cursorIndex !== undefined;
	}

	public append(text: string) {
		if (this.isTransformed) {
			throw new Error('Appending after transform is illegal?');
		}

		if (this.cursorAtEnd) {
			this.cursorIndex = this.text.length;
			this.cursorAtEnd = false;
		}
		this.text += text;
	}

	public appendHelper(other: InlineCursorHelper) {
		if (this.isTransformed) {
			throw new Error('Appending after transform is illegal?');
		}

		if (other.cursorIndex !== undefined) {
			this.cursorIndex = this.text.length + other.cursorIndex;
		} else if (other.cursorAtEnd) {
			this.cursorAtEnd = true;
		}
		this.text += other.text;
	}

	public transform(handler: (text: string) => string) {
		this.isTransformed = true;
		const withCursor = this.ensureTextWithCursor();
		if (withCursor != null) {
			this.textWithCursor = handler(withCursor);
		}
		this.text = handler(this.text);
	}

	public setCursorPosition() {
		this.cursorIndex = undefined;
		this.cursorAtEnd = true;
	}

	public locateCursorPosition(): CursorPosition | undefined {
		if (this.cursorAtEnd) {
			return getPositionWhen(this.text, () => false);
		}

		const withCursor = this.ensureTextWithCursor();
		const cursorSequence = this.cursorSequence;
		if (withCursor === undefined || cursorSequence === undefined) {
			return undefined;
		}

		// NOTE: This works because the first chunk of the ansi
		// sequence carries our ink://cursor emblem.
		const valueToFind = getAnsiCursorToken(cursorSequence);
		const {x, y, found} = getPositionWhen(withCursor, token => {
			return token.value === valueToFind;
		});
		if (!found) {
			return;
		}

		return {x, y};
	}

	private ensureTextWithCursor() {
		if (this.textWithCursor) {
			return this.textWithCursor;
		}

		let withCursor: string;
		if (this.cursorAtEnd) {
			withCursor = this.text;
		} else if (this.cursorIndex !== undefined) {
			const afterCursor = this.text.slice(this.cursorIndex);
			const nextGraphemeEntry = iterateGraphemeSegments(
				stripVTControlCharacters(afterCursor),
			)
				[Symbol.iterator]()
				.next();
			if (nextGraphemeEntry.done === true) {
				this.cursorAtEnd = true;
				withCursor = this.text;
			} else {
				const grapheme = nextGraphemeEntry.value.segment;
				const searchSequence = ansiEscapes.link(grapheme, 'ink://cursor');
				this.cursorSequence = searchSequence;
				withCursor =
					this.text.slice(0, this.cursorIndex) +
					searchSequence +
					this.text.slice(this.cursorIndex + grapheme.length);
			}
		} else {
			// No cursor
			return;
		}

		this.textWithCursor = withCursor;
		return withCursor;
	}
}

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

const getAnsiCursorToken = (linkString: string) => {
	const firstItem = iterateAnsiGraphemes(linkString).next();
	if (firstItem.done === true) {
		throw new Error('No ansi found in link string?');
	}

	return firstItem.value.token.value;
};
