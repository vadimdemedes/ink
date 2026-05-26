import ansiEscapes from 'ansi-escapes';

export type CursorPosition = {
	x: number;
	y: number;
};

const showCursorEscape = '\u001B[?25h';
const hideCursorEscape = '\u001B[?25l';

export {showCursorEscape, hideCursorEscape};

export type CursorShape =
	| 'default'
	| 'block'
	| 'bar'
	| 'underline'
	| 'blinking-block'
	| 'blinking-bar'
	| 'blinking-underline';

const cursorShapeCodes: Record<CursorShape, number> = {
	default: 0,
	'blinking-block': 1,
	block: 2,
	'blinking-underline': 3,
	underline: 4,
	'blinking-bar': 5,
	bar: 6,
};

export const resetCursorShapeEscape = '\u001B[0 q';

/**
Compare two cursor positions. Returns true if they differ.
*/
export const cursorPositionChanged = (
	a: CursorPosition | undefined,
	b: CursorPosition | undefined,
): boolean => a?.x !== b?.x || a?.y !== b?.y;

/**
Compare two cursor shapes. Returns true if they differ.
*/
export const cursorShapeChanged = (
	a: CursorShape | undefined,
	b: CursorShape | undefined,
): boolean => a !== b;

/**
Build DECSCUSR escape sequence to set cursor shape.
Returns empty string when shape is `undefined`.
*/
export const buildCursorShapeEscape = (
	shape: CursorShape | undefined,
): string => {
	if (shape === undefined) {
		return '';
	}

	return `\u001B[${cursorShapeCodes[shape]} q`;
};

/**
Build escape sequence to move cursor from bottom of output to the target position and show it.
Assumes cursor is at (col 0, line visibleLineCount) — i.e. just after the last output line.
*/
export const buildCursorSuffix = (
	visibleLineCount: number,
	cursorPosition: CursorPosition | undefined,
): string => {
	if (!cursorPosition) {
		return '';
	}

	const moveUp = visibleLineCount - cursorPosition.y;
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

	// PreviousLineCount includes trailing newline, so visible lines = previousLineCount - 1
	// cursor is at previousCursorPosition.y, need to go to line (previousLineCount - 1)
	const down = previousLineCount - 1 - previousCursorPosition.y;
	return (
		(down > 0 ? ansiEscapes.cursorDown(down) : '') + ansiEscapes.cursorTo(0)
	);
};

export type CursorOnlyInput = {
	cursorWasShown: boolean;
	previousLineCount: number;
	previousCursorPosition: CursorPosition | undefined;
	visibleLineCount: number;
	cursorPosition: CursorPosition | undefined;
};

/**
Build the escape sequence for cursor-only updates (output unchanged, cursor moved).
Hides cursor if it was previously shown, returns to bottom, then repositions.
*/
export const buildCursorOnlySequence = (input: CursorOnlyInput): string => {
	const hidePrefix = input.cursorWasShown ? hideCursorEscape : '';
	const returnToBottom = buildReturnToBottom(
		input.previousLineCount,
		input.previousCursorPosition,
	);
	const cursorSuffix = buildCursorSuffix(
		input.visibleLineCount,
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
