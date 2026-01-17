import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

export type CursorPosition = {
	/**
	 * Column position (0-based).
	 */
	readonly x?: number;

	/**
	 * Row position from the bottom of the output (0 = last line, 1 = second to last, etc.)
	 */
	readonly y?: number;
};

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	applyCursorPositionNow: () => void;
	(str: string): void;
};

const createStandard = (
	stream: Writable,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	// Track cursor position for IME support
	let cursorPosition: CursorPosition | undefined;
	let cursorMovedUp = 0;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		previousOutput = output;
		// lineCount includes the empty string after the trailing newline
		// e.g., "a\nb\n" splits to ["a", "b", ""] with length 3
		const lines = output.split('\n');
		const lineCount = lines.length;
		// visibleLineCount is the actual number of visible lines
		const visibleLineCount = lineCount - 1;

		// If cursor was moved up for IME, move it back down before erasing
		let preCursorFix = '';
		if (cursorMovedUp > 0) {
			preCursorFix = ansiEscapes.cursorDown(cursorMovedUp);
			cursorMovedUp = 0;
		}

		// Calculate cursor position for IME (to be applied within the same write)
		let postCursorMove = '';
		if (cursorPosition) {
			const {x, y} = cursorPosition;

			// After writing output (ending with \n), cursor is at the start of a new line
			// below the last visible line. cursorUp(y) moves y lines up.
			// y=1 means last visible line, y=2 means second-to-last, etc.
			if (y !== undefined && y > 0 && y <= visibleLineCount) {
				postCursorMove += ansiEscapes.cursorUp(y);
				cursorMovedUp = y;
			}

			// Move cursor to specific column if x is specified
			if (x !== undefined) {
				postCursorMove += ansiEscapes.cursorTo(x);
			}
		}

		// Begin Synchronized Update Mode - prevents terminal multiplexers from reading
		// intermediate cursor positions during rendering, fixing IME issues
		// Include cursor positioning within the synchronized update to ensure atomic operation
		stream.write(
			'\u001B[?2026h' +
				preCursorFix +
				ansiEscapes.eraseLines(previousLineCount) +
				output +
				'\u001B[?2026l' +
				postCursorMove,
		);
		previousLineCount = lineCount;
	};

	render.clear = () => {
		// Restore cursor position before clearing
		if (cursorMovedUp > 0) {
			stream.write(ansiEscapes.cursorDown(cursorMovedUp));
			cursorMovedUp = 0;
		}

		stream.write(ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
	};

	render.done = () => {
		// Restore cursor position before finishing
		if (cursorMovedUp > 0) {
			stream.write(ansiEscapes.cursorDown(cursorMovedUp));
			cursorMovedUp = 0;
		}

		previousOutput = '';
		previousLineCount = 0;

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

	render.applyCursorPositionNow = () => {
		// Apply cursor position immediately without re-rendering
		// This is used when cursorPosition is set after render
		if (!cursorPosition) {
			return;
		}

		const visibleLineCount = previousLineCount - 1;
		const {x, y} = cursorPosition;
		let cursorMove = '';

		// First, restore cursor to bottom if it was moved up
		if (cursorMovedUp > 0) {
			cursorMove += ansiEscapes.cursorDown(cursorMovedUp);
			cursorMovedUp = 0;
		}

		// Then move to the new position
		if (y !== undefined && y > 0 && y <= visibleLineCount) {
			cursorMove += ansiEscapes.cursorUp(y);
			cursorMovedUp = y;
		}

		if (x !== undefined) {
			cursorMove += ansiEscapes.cursorTo(x);
		}

		if (cursorMove) {
			stream.write(cursorMove);
		}
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
	// Track cursor position for IME support
	let cursorPosition: CursorPosition | undefined;
	let cursorMovedUp = 0;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		const previousCount = previousLines.length;
		const nextLines = output.split('\n');
		const nextCount = nextLines.length;
		const visibleCount = nextCount - 1;

		// If cursor was moved up for IME, move it back down before processing
		let preCursorFix = '';
		if (cursorMovedUp > 0) {
			preCursorFix = ansiEscapes.cursorDown(cursorMovedUp);
			cursorMovedUp = 0;
		}

		// Calculate cursor position for IME
		const calcPostCursorMove = (): string => {
			let cursorMove = '';
			if (cursorPosition) {
				const {x, y} = cursorPosition;

				// After writing output, cursor is below the last visible line
				// y=1 means last visible line, y=2 means second-to-last, etc.
				if (y !== undefined && y > 0 && y <= visibleCount) {
					cursorMove += ansiEscapes.cursorUp(y);
					cursorMovedUp = y;
				}

				// Move cursor to specific column if x is specified
				if (x !== undefined) {
					cursorMove += ansiEscapes.cursorTo(x);
				}
			}
			return cursorMove;
		};

		// Begin Synchronized Update Mode
		if (output === '\n' || previousOutput.length === 0) {
			const postCursorMove = calcPostCursorMove();
			stream.write(
				'\u001B[?2026h' +
					preCursorFix +
					ansiEscapes.eraseLines(previousCount) +
					output +
					'\u001B[?2026l' +
					postCursorMove,
			);
			previousOutput = output;
			previousLines = nextLines;

			return;
		}

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

		// Add cursor fix at the beginning
		if (preCursorFix) {
			buffer.push(preCursorFix);
		}

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

		const postCursorMove = calcPostCursorMove();
		stream.write(
			'\u001B[?2026h' + buffer.join('') + '\u001B[?2026l' + postCursorMove,
		);

		previousOutput = output;
		previousLines = nextLines;
	};

	render.clear = () => {
		// Restore cursor position before clearing
		if (cursorMovedUp > 0) {
			stream.write(ansiEscapes.cursorDown(cursorMovedUp));
			cursorMovedUp = 0;
		}

		stream.write(ansiEscapes.eraseLines(previousLines.length));
		previousOutput = '';
		previousLines = [];
	};

	render.done = () => {
		// Restore cursor position before finishing
		if (cursorMovedUp > 0) {
			stream.write(ansiEscapes.cursorDown(cursorMovedUp));
			cursorMovedUp = 0;
		}

		previousOutput = '';
		previousLines = [];

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

	render.applyCursorPositionNow = () => {
		// Apply cursor position immediately without re-rendering
		// This is used when cursorPosition is set after render
		if (!cursorPosition) {
			return;
		}

		const visibleLineCount = previousLines.length - 1;
		const {x, y} = cursorPosition;
		let cursorMove = '';

		// First, restore cursor to bottom if it was moved up
		if (cursorMovedUp > 0) {
			cursorMove += ansiEscapes.cursorDown(cursorMovedUp);
			cursorMovedUp = 0;
		}

		// Then move to the new position
		if (y !== undefined && y > 0 && y <= visibleLineCount) {
			cursorMove += ansiEscapes.cursorUp(y);
			cursorMovedUp = y;
		}

		if (x !== undefined) {
			cursorMove += ansiEscapes.cursorTo(x);
		}

		if (cursorMove) {
			stream.write(cursorMove);
		}
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
