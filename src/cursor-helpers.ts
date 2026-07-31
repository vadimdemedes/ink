import ansiEscapes from 'ansi-escapes';

export type CursorPosition = {
	x: number;
	y: number;
};

const showCursorEscape = '\u001B[?25h';
const hideCursorEscape = '\u001B[?25l';

export {showCursorEscape, hideCursorEscape};

/**
Compare two cursor positions. Returns true if they differ.
*/
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
	cursorWasShown: boolean,
	previousLineCount: number,
	previousCursorPosition: CursorPosition | undefined,
): string => {
	if (!cursorWasShown) {
		return '';
	}

	return (
		hideCursorEscape +
		buildReturnToBottom(previousLineCount, previousCursorPosition)
	);
};
