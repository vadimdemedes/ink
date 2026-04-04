import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import {
	type CursorPosition,
	cursorPositionChanged,
	buildCursorSuffix,
	buildCursorOnlySequence,
	buildReturnToBottomPrefix,
	hideCursorEscape,
} from './cursor-helpers.js';
import {CURSOR_MARKER, replaceCursorMarker} from './cursor-marker.js';

export type {CursorPosition} from './cursor-helpers.js';

// Synchronized Update Mode — bracket the frame so terminal multiplexers
// (tmux, screen) treat the whole write as one atomic repaint.
const SUM_BEGIN = '\u001B[?2026h';
const SUM_END = '\u001B[?2026l';
const RESTORE_AND_SHOW_CURSOR = '\u001B[u\u001B[?25h';

export type LogUpdateOptions = {
	showCursor?: boolean;
	incremental?: boolean;
	enableImeCursor?: boolean;
};

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	reset: () => void;
	sync: (str: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	isCursorDirty: () => boolean;
	willRender: (str: string) => boolean;
	(str: string): boolean;
};

// Count visible lines in a string, ignoring the trailing empty element
// that `split('\n')` produces when the string ends with '\n'.
const visibleLineCount = (lines: string[], str: string): number =>
	str.endsWith('\n') ? lines.length - 1 : lines.length;

const createStandard = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let cursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;

	const getActiveCursor = () => (cursorDirty ? cursorPosition : undefined);
	const hasChanges = (
		str: string,
		activeCursor: CursorPosition | undefined,
	): boolean => {
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		return str !== previousOutput || cursorChanged;
	};

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		cursorDirty = false;
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);

		if (!hasChanges(str, activeCursor)) {
			return false;
		}

		let frameContent = str;
		let hasImeCursor = false;

		if (enableImeCursor) {
			const result = replaceCursorMarker(frameContent);
			frameContent = result.output;
			hasImeCursor = result.hasCursor;
		} else {
			frameContent = frameContent.replaceAll(CURSOR_MARKER, '');
		}

		const lines = frameContent.split('\n');
		const visibleCount = visibleLineCount(lines, frameContent);
		const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);

		if (enableImeCursor) {
			stream.write(SUM_BEGIN);
		}

		if (str === previousOutput && cursorChanged && !hasImeCursor) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown,
					previousLineCount,
					previousCursorPosition,
					visibleLineCount: visibleCount,
					cursorPosition: activeCursor,
				}),
			);
		} else {
			previousOutput = str;
			const returnPrefix = buildReturnToBottomPrefix(
				cursorWasShown,
				previousLineCount,
				previousCursorPosition,
			);
			stream.write(
				returnPrefix +
					ansiEscapes.eraseLines(previousLineCount) +
					frameContent +
					(hasImeCursor ? '' : cursorSuffix),
			);
			previousLineCount = lines.length;

			if (hasImeCursor) {
				stream.write(RESTORE_AND_SHOW_CURSOR);
			}
		}

		if (enableImeCursor) {
			stream.write(SUM_END);
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		cursorWasShown = activeCursor !== undefined || hasImeCursor;
		return true;
	};

	render.clear = () => {
		const prefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLineCount,
			previousCursorPosition,
		);
		stream.write(prefix + ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.done = () => {
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		cursorWasShown = false;

		if (!showCursor) {
			cliCursor.show(stream);
			hasHiddenCursor = false;
		}
	};

	render.reset = () => {
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.sync = (str: string) => {
		const activeCursor = cursorDirty ? cursorPosition : undefined;
		cursorDirty = false;

		const lines = str.split('\n');
		previousOutput = str;
		previousLineCount = lines.length;

		if (!activeCursor && cursorWasShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(
				buildCursorSuffix(visibleLineCount(lines, str), activeCursor),
			);
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		cursorWasShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
		cursorDirty = true;
	};

	render.isCursorDirty = () => cursorDirty;
	render.willRender = (str: string) => hasChanges(str, getActiveCursor());

	return render;
};

const createIncremental = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let cursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;

	const getActiveCursor = () => (cursorDirty ? cursorPosition : undefined);
	const hasChanges = (
		str: string,
		activeCursor: CursorPosition | undefined,
	): boolean => {
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		return str !== previousOutput || cursorChanged;
	};

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		cursorDirty = false;
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);

		if (!hasChanges(str, activeCursor)) {
			return false;
		}

		let frameContent = str;
		let hasImeCursor = false;

		if (enableImeCursor) {
			const result = replaceCursorMarker(frameContent);
			frameContent = result.output;
			hasImeCursor = result.hasCursor;
		} else {
			frameContent = frameContent.replaceAll(CURSOR_MARKER, '');
		}

		const nextLines = frameContent.split('\n');
		const visibleCount = visibleLineCount(nextLines, frameContent);
		const previousVisible = visibleLineCount(previousLines, previousOutput);

		if (enableImeCursor) {
			stream.write(SUM_BEGIN);
		}

		if (str === previousOutput && cursorChanged && !hasImeCursor) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown,
					previousLineCount: previousLines.length,
					previousCursorPosition,
					visibleLineCount: visibleCount,
					cursorPosition: activeCursor,
				}),
			);
			previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
			cursorWasShown = activeCursor !== undefined;
			if (enableImeCursor) {
				stream.write(SUM_END);
			}
			return true;
		}

		const returnPrefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLines.length,
			previousCursorPosition,
		);

		if (frameContent === '\n' || previousOutput.length === 0) {
			const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);
			stream.write(
				returnPrefix +
					ansiEscapes.eraseLines(previousLines.length) +
					frameContent +
					(hasImeCursor ? '' : cursorSuffix),
			);
			if (hasImeCursor) {
				stream.write(RESTORE_AND_SHOW_CURSOR);
			}
			cursorWasShown = activeCursor !== undefined || hasImeCursor;
			previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
			previousOutput = str;
			previousLines = nextLines;
			if (enableImeCursor) {
				stream.write(SUM_END);
			}
			return true;
		}

		const hasTrailingNewline = frameContent.endsWith('\n');

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

		buffer.push(returnPrefix);

		// Clear extra lines if the current content's line count is lower than the previous.
		if (visibleCount < previousVisible) {
			const previousHadTrailingNewline = previousOutput.endsWith('\n');
			const extraSlot = previousHadTrailingNewline ? 1 : 0;
			buffer.push(
				ansiEscapes.eraseLines(previousVisible - visibleCount + extraSlot),
				ansiEscapes.cursorUp(visibleCount),
			);
		} else {
			buffer.push(ansiEscapes.cursorUp(previousLines.length - 1));
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

		if (!hasImeCursor) {
			const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);
			buffer.push(cursorSuffix);
		}

		stream.write(buffer.join(''));

		if (hasImeCursor) {
			stream.write(RESTORE_AND_SHOW_CURSOR);
		}

		if (enableImeCursor) {
			stream.write(SUM_END);
		}

		cursorWasShown = activeCursor !== undefined || hasImeCursor;
		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		previousOutput = str;
		previousLines = nextLines;
		return true;
	};

	render.clear = () => {
		const prefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLines.length,
			previousCursorPosition,
		);
		stream.write(prefix + ansiEscapes.eraseLines(previousLines.length));
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.done = () => {
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		cursorWasShown = false;

		if (!showCursor) {
			cliCursor.show(stream);
			hasHiddenCursor = false;
		}
	};

	render.reset = () => {
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.sync = (str: string) => {
		const activeCursor = cursorDirty ? cursorPosition : undefined;
		cursorDirty = false;

		const lines = str.split('\n');
		previousOutput = str;
		previousLines = lines;

		if (!activeCursor && cursorWasShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(
				buildCursorSuffix(visibleLineCount(lines, str), activeCursor),
			);
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		cursorWasShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
		cursorDirty = true;
	};

	render.isCursorDirty = () => cursorDirty;
	render.willRender = (str: string) => hasChanges(str, getActiveCursor());

	return render;
};

const create = (
	stream: Writable,
	{showCursor = false, incremental = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	if (incremental) {
		return createIncremental(stream, {showCursor, enableImeCursor});
	}

	return createStandard(stream, {showCursor, enableImeCursor});
};

const logUpdate = {create};
export default logUpdate;
