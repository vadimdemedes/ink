import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import isInCi from 'is-in-ci';

// Synchronized Update Mode escape sequences
// These prevent terminal multiplexers from reading intermediate cursor positions
const beginSynchronizedUpdate = '\u001B[?2026h';
const endSynchronizedUpdate = '\u001B[?2026l';

// Check if synchronized update should be used
// Only use on TTY streams and not in CI environments
const shouldSynchronize = (stream: Writable): boolean => {
	return (stream as NodeJS.WriteStream).isTTY && !isInCi;
};

export type CursorPosition = {
	/**
	 * Column position (0-based).
	 */
	readonly x?: number;

	/**
	 * Row position from the bottom of the output (0 = last line, 1 = second to last, etc.)
	 */
	readonly y?: number;

	/**
	 * Whether to show the cursor. When true, the cursor will be visible at the specified position.
	 * This is useful for IME support, as IME candidate windows typically appear at the cursor position.
	 * Defaults to false.
	 */
	readonly visible?: boolean;
};

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	applyCursorPositionNow: () => void;
	(str: string): void;
};

// Count visible lines in a string, ignoring the trailing empty element
// that `split('\n')` produces when the string ends with '\n'.
const visibleLineCount = (lines: string[], str: string): number =>
	str.endsWith('\n') ? lines.length - 1 : lines.length;

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
	// Cache whether to use synchronized update (TTY check)
	const useSynchronizedUpdate = shouldSynchronize(stream);

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		if (str === previousOutput) {
			return;
		}

		previousOutput = str;
		// LineCount includes the empty string after the trailing newline
		// E.g., "a\nb\n" splits to ["a", "b", ""] with length 3
		const lines = str.split('\n');
		const lineCount = lines.length;
		// VisibleLineCount is the actual number of visible lines
		const visibleCount = visibleLineCount(lines, str);

		// If cursor was moved up for IME, move it back down before erasing
		let preCursorFix = '';
		if (cursorMovedUp > 0) {
			preCursorFix = ansiEscapes.cursorDown(cursorMovedUp);
			cursorMovedUp = 0;
		}

		// Calculate cursor position for IME (to be applied within the same write)
		let postCursorMove = '';
		if (cursorPosition && useSynchronizedUpdate) {
			const {x, y, visible} = cursorPosition;

			// After writing output (ending with \n), cursor is at the start of a new line
			// below the last visible line. cursorUp(y) moves y lines up.
			// y=1 means last visible line, y=2 means second-to-last, etc.
			if (y !== undefined && y > 0 && y <= visibleCount) {
				postCursorMove += ansiEscapes.cursorUp(y);
				cursorMovedUp = y;
			}

			// Move cursor to specific column if x is specified
			if (x !== undefined) {
				postCursorMove += ansiEscapes.cursorTo(x);
			}

			// Show cursor if visible is true (for IME support)
			if (visible) {
				postCursorMove += ansiEscapes.cursorShow;
			}
		}

		// Use Synchronized Update Mode only on TTY streams (not in CI)
		// This prevents terminal multiplexers from reading intermediate cursor positions
		const prefix = useSynchronizedUpdate
			? beginSynchronizedUpdate + preCursorFix
			: '';
		const suffix = useSynchronizedUpdate
			? endSynchronizedUpdate + postCursorMove
			: '';

		stream.write(
			prefix + ansiEscapes.eraseLines(previousLineCount) + str + suffix,
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
		previousOutput = str;
		previousLineCount = str.split('\n').length;
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
		const {x, y, visible} = cursorPosition;
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

		// Show cursor if visible is true (for IME support)
		if (visible) {
			cursorMove += ansiEscapes.cursorShow;
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
	// Cache whether to use synchronized update (TTY check)
	const useSynchronizedUpdate = shouldSynchronize(stream);

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		if (str === previousOutput) {
			return;
		}

		const nextLines = str.split('\n');
		const visibleCount = visibleLineCount(nextLines, str);

		// If cursor was moved up for IME, move it back down before processing
		let preCursorFix = '';
		if (cursorMovedUp > 0 && useSynchronizedUpdate) {
			preCursorFix = ansiEscapes.cursorDown(cursorMovedUp);
			cursorMovedUp = 0;
		}

		// Calculate cursor position for IME
		const calcPostCursorMove = (): string => {
			if (!useSynchronizedUpdate) {
				return '';
			}

			let cursorMove = '';
			if (cursorPosition) {
				const {x, y, visible} = cursorPosition;

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

				// Show cursor if visible is true (for IME support)
				if (visible) {
					cursorMove += ansiEscapes.cursorShow;
				}
			}

			return cursorMove;
		};

		// Use Synchronized Update Mode only on TTY streams (not in CI)
		if (str === '\n' || previousOutput.length === 0) {
			const postCursorMove = calcPostCursorMove();
			const prefix = useSynchronizedUpdate
				? beginSynchronizedUpdate + preCursorFix
				: '';
			const suffix = useSynchronizedUpdate
				? endSynchronizedUpdate + postCursorMove
				: '';
			stream.write(
				prefix + ansiEscapes.eraseLines(previousLines.length) + str + suffix,
			);
			previousOutput = str;
			previousLines = nextLines;

			return;
		}

		const previousVisible = visibleLineCount(previousLines, previousOutput);
		const hasTrailingNewline = str.endsWith('\n');

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

		// Add cursor fix at the beginning (only when synchronized update is enabled)
		if (preCursorFix && useSynchronizedUpdate) {
			buffer.push(preCursorFix);
		}

		// Clear extra lines if the current content's line count is lower than the previous.
		if (visibleCount < previousVisible) {
			const previousHadTrailingNewline = previousOutput.endsWith('\n');
			const extraSlot = previousHadTrailingNewline ? 1 : 0;
			buffer.push(
				ansiEscapes.eraseLines(previousVisible - visibleCount + extraSlot),
				ansiEscapes.cursorUp(visibleCount),
			);
		} else {
			buffer.push(ansiEscapes.cursorUp(previousVisible - 1));
		}

		for (let i = 0; i < visibleCount; i++) {
			const isLastLine = i === visibleCount - 1;

			// We do not write lines if the contents are the same. This prevents flickering during renders.
			if (nextLines[i] === previousLines[i]) {
				// Don't move past the last line when there's no trailing newline,
				// otherwise the cursor overshoots the rendered block.
				if (!isLastLine || hasTrailingNewline) {
					buffer.push(ansiEscapes.cursorNextLine);
				}

				continue;
			}

			buffer.push(
				ansiEscapes.cursorTo(0) +
					nextLines[i] +
					ansiEscapes.eraseEndLine +
					// Don't append newline after the last line when the input
					// has no trailing newline (fullscreen mode).
					(isLastLine && !hasTrailingNewline ? '' : '\n'),
			);
		}

		const postCursorMove = calcPostCursorMove();
		const prefix = useSynchronizedUpdate ? beginSynchronizedUpdate : '';
		const suffix = useSynchronizedUpdate
			? endSynchronizedUpdate + postCursorMove
			: '';
		stream.write(prefix + buffer.join('') + suffix);

		previousOutput = str;
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
		previousOutput = str;
		previousLines = str.split('\n');
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
		const {x, y, visible} = cursorPosition;
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

		// Show cursor if visible is true (for IME support)
		if (visible) {
			cursorMove += ansiEscapes.cursorShow;
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
