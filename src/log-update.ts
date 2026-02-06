import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import writeSynchronized from './write-synchronized.js';

export type CursorPosition = {
	x: number;
	y: number;
};

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	(str: string): void;
};

const showCursorEscape = '\u001B[?25h';
const hideCursorEscape = '\u001B[?25l';

/**
Build escape sequence to move cursor from bottom of output to the target position and show it.
Assumes cursor is at (col 0, line visibleLineCount) — i.e. just after the last output line.
*/
const buildCursorSuffix = (
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
const buildReturnToBottom = (
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

const createStandard = (
	stream: Writable,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		const cursorChanged =
			cursorPosition?.x !== previousCursorPosition?.x ||
			cursorPosition?.y !== previousCursorPosition?.y;

		if (output === previousOutput && !cursorChanged) {
			return;
		}

		const visibleLineCount = output.split('\n').length - 1;
		const cursorSuffix = buildCursorSuffix(visibleLineCount, cursorPosition);

		if (output === previousOutput && cursorChanged) {
			// Output unchanged but cursor moved — return to bottom, then reposition
			const returnToBottom = buildReturnToBottom(
				previousLineCount,
				previousCursorPosition,
			);
			const hidePrefix = cursorWasShown ? hideCursorEscape : '';
			writeSynchronized(stream, hidePrefix + returnToBottom + cursorSuffix);
		} else {
			previousOutput = output;
			// Return to bottom before erasing, so eraseLines works from the correct position
			const returnToBottom = cursorWasShown
				? hideCursorEscape +
					buildReturnToBottom(previousLineCount, previousCursorPosition)
				: '';
			writeSynchronized(
				stream,
				returnToBottom +
					ansiEscapes.eraseLines(previousLineCount) +
					output +
					cursorSuffix,
			);
			previousLineCount = output.split('\n').length;
		}

		previousCursorPosition = cursorPosition ? {...cursorPosition} : undefined;
		cursorWasShown = cursorPosition !== undefined;
	};

	const resetCursorState = () => {
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	const returnToBottomSequence = () => {
		if (!cursorWasShown) {
			return '';
		}

		return (
			hideCursorEscape +
			buildReturnToBottom(previousLineCount, previousCursorPosition)
		);
	};

	render.clear = () => {
		const prefix = returnToBottomSequence();
		writeSynchronized(
			stream,
			prefix + ansiEscapes.eraseLines(previousLineCount),
		);
		previousOutput = '';
		previousLineCount = 0;
		resetCursorState();
	};

	render.done = () => {
		previousOutput = '';
		previousLineCount = 0;
		resetCursorState();

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		const output = str + '\n';
		previousOutput = output;
		previousLineCount = output.split('\n').length;
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
	};

	return render;
};

const createIncremental = (
	stream: Writable,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		const cursorChanged =
			cursorPosition?.x !== previousCursorPosition?.x ||
			cursorPosition?.y !== previousCursorPosition?.y;

		if (output === previousOutput && !cursorChanged) {
			return;
		}

		const previousCount = previousLines.length;
		const nextLines = output.split('\n');
		const nextCount = nextLines.length;
		const visibleCount = nextCount - 1;

		if (output === previousOutput && cursorChanged) {
			// Output unchanged but cursor moved — return to bottom, then reposition
			const returnToBottom = buildReturnToBottom(
				previousCount,
				previousCursorPosition,
			);
			const cursorSuffix = buildCursorSuffix(visibleCount, cursorPosition);
			const hidePrefix = cursorWasShown ? hideCursorEscape : '';
			writeSynchronized(stream, hidePrefix + returnToBottom + cursorSuffix);
			previousCursorPosition = cursorPosition ? {...cursorPosition} : undefined;
			cursorWasShown = cursorPosition !== undefined;
			return;
		}

		// Return to bottom before modifying output
		const returnToBottom = cursorWasShown
			? hideCursorEscape +
				buildReturnToBottom(previousCount, previousCursorPosition)
			: '';

		if (output === '\n' || previousOutput.length === 0) {
			const cursorSuffix = buildCursorSuffix(visibleCount, cursorPosition);
			writeSynchronized(
				stream,
				returnToBottom +
					ansiEscapes.eraseLines(previousCount) +
					output +
					cursorSuffix,
			);
			cursorWasShown = cursorPosition !== undefined;
			previousCursorPosition = cursorPosition ? {...cursorPosition} : undefined;
			previousOutput = output;
			previousLines = nextLines;
			return;
		}

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

		buffer.push(returnToBottom);

		// Clear extra lines if the current content's line count is lower than the previous.
		if (nextCount < previousCount) {
			buffer.push(
				// Erases the trailing lines and the final newline slot.
				ansiEscapes.eraseLines(previousCount - nextCount + 1),
				// Positions cursor to the top of the rendered output.
				ansiEscapes.cursorUp(visibleCount),
			);
		} else {
			buffer.push(ansiEscapes.cursorUp(previousCount - 1));
		}

		for (let i = 0; i < visibleCount; i++) {
			// We do not write lines if the contents are the same. This prevents flickering during renders.
			if (nextLines[i] === previousLines[i]) {
				buffer.push(ansiEscapes.cursorNextLine);
				continue;
			}

			buffer.push(
				ansiEscapes.cursorTo(0) +
					nextLines[i] +
					ansiEscapes.eraseEndLine +
					'\n',
			);
		}

		const cursorSuffix = buildCursorSuffix(visibleCount, cursorPosition);
		buffer.push(cursorSuffix);

		writeSynchronized(stream, buffer.join(''));

		cursorWasShown = cursorPosition !== undefined;
		previousCursorPosition = cursorPosition ? {...cursorPosition} : undefined;
		previousOutput = output;
		previousLines = nextLines;
	};

	const resetCursorState = () => {
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	const returnToBottomSequence = () => {
		if (!cursorWasShown) {
			return '';
		}

		return (
			hideCursorEscape +
			buildReturnToBottom(previousLines.length, previousCursorPosition)
		);
	};

	render.clear = () => {
		const prefix = returnToBottomSequence();
		writeSynchronized(
			stream,
			prefix + ansiEscapes.eraseLines(previousLines.length),
		);
		previousOutput = '';
		previousLines = [];
		resetCursorState();
	};

	render.done = () => {
		previousOutput = '';
		previousLines = [];
		resetCursorState();

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		const output = str + '\n';
		previousOutput = output;
		previousLines = output.split('\n');
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
	};

	return render;
};

const create = (
	stream: Writable,
	{showCursor = false, incremental = false} = {},
): LogUpdate => {
	if (incremental) {
		return createIncremental(stream, {showCursor});
	}

	return createStandard(stream, {showCursor});
};

const logUpdate = {create};
export default logUpdate;
