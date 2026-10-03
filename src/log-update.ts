import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import lineUpdate from './line-update.js';
import type {OutputStream} from './stream.js';
import {
	type CursorPosition,
	cursorPositionChanged,
	buildCursorSuffix,
	buildCursorOnlySequence,
	buildReturnToBottomPrefix,
	buildReturnToBottom,
	buildEraseFrame,
	hideCursorEscape,
} from './cursor-helpers.js';

export type {CursorPosition} from './cursor-helpers.js';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	reset: () => void;
	sync: (text: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	isCursorDirty: () => boolean;
	willRender: (text: string) => boolean;
	// Where the last render or sync left the real cursor, relative to the top of that frame. Undefined when no cursor position was active or after clear, reset or done.
	getCursorPosition: () => CursorPosition | undefined;
	(text: string): boolean;
};

// Count visible lines in a string, ignoring the trailing empty element
// that `split('\n')` produces when the string ends with '\n'.
const visibleLineCount = (lines: string[], text: string): number =>
	text.endsWith('\n') ? lines.length - 1 : lines.length;

const createStandard = (
	stream: NodeJS.WritableStream,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let isCursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let wasCursorShown = false;

	const getActiveCursor = () => (isCursorDirty ? cursorPosition : undefined);
	const hasChanges = (
		text: string,
		activeCursor: CursorPosition | undefined,
	): boolean => {
		const hasCursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		return text !== previousOutput || hasCursorChanged;
	};

	const render = (text: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		isCursorDirty = false;
		const hasCursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);

		if (!hasChanges(text, activeCursor)) {
			return false;
		}

		const lines = text.split('\n');
		const cursorSuffix = buildCursorSuffix(lines.length - 1, activeCursor);

		if (text === previousOutput && hasCursorChanged) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown: wasCursorShown,
					previousLineCount,
					previousCursorPosition,
					cursorPosition: activeCursor,
				}),
			);
		} else {
			previousOutput = text;
			const returnPrefix = buildReturnToBottomPrefix(
				wasCursorShown,
				previousLineCount,
				previousCursorPosition,
			);
			stream.write(
				returnPrefix +
					ansiEscapes.eraseLines(previousLineCount) +
					text +
					cursorSuffix,
			);
			previousLineCount = lines.length;
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		wasCursorShown = activeCursor !== undefined;
		return true;
	};

	render.clear = () => {
		stream.write(buildEraseFrame(previousLineCount, previousCursorPosition));
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		wasCursorShown = false;
	};

	render.done = () => {
		if (previousCursorPosition) {
			// Leave the terminal at the output bottom before discarding the cursor position.
			stream.write(
				buildReturnToBottom(previousLineCount, previousCursorPosition),
			);
		}

		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		wasCursorShown = false;

		if (showCursor) {
			return;
		}

		cliCursor.show(stream);
		hasHiddenCursor = false;
	};

	render.reset = () => {
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		wasCursorShown = false;
	};

	render.sync = (text: string) => {
		const activeCursor = isCursorDirty ? cursorPosition : undefined;
		isCursorDirty = false;

		const lines = text.split('\n');
		previousOutput = text;
		previousLineCount = lines.length;

		if (!activeCursor && wasCursorShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(buildCursorSuffix(lines.length - 1, activeCursor));
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		wasCursorShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
		isCursorDirty = true;
	};

	render.isCursorDirty = () => isCursorDirty;
	render.willRender = (text: string) => hasChanges(text, getActiveCursor());
	render.getCursorPosition = () => previousCursorPosition;

	return render;
};

const createIncremental = (
	stream: OutputStream,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let previousColumns = stream.columns;
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let isCursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let wasCursorShown = false;

	const getActiveCursor = () => (isCursorDirty ? cursorPosition : undefined);
	const hasChanges = (
		text: string,
		activeCursor: CursorPosition | undefined,
	): boolean => {
		const hasCursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		return text !== previousOutput || hasCursorChanged;
	};

	const render = (text: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		isCursorDirty = false;
		const hasCursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);

		if (!hasChanges(text, activeCursor)) {
			return false;
		}

		const areColumnsUnchanged = previousColumns === stream.columns;
		previousColumns = stream.columns;
		const nextLines = text.split('\n');
		const visibleCount = visibleLineCount(nextLines, text);
		const previousVisible = visibleLineCount(previousLines, previousOutput);

		if (text === previousOutput && hasCursorChanged) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown: wasCursorShown,
					previousLineCount: previousLines.length,
					previousCursorPosition,
					cursorPosition: activeCursor,
				}),
			);
			previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
			wasCursorShown = activeCursor !== undefined;
			return true;
		}

		const returnPrefix = buildReturnToBottomPrefix(
			wasCursorShown,
			previousLines.length,
			previousCursorPosition,
		);

		if (text === '\n' || previousOutput.length === 0) {
			const cursorSuffix = buildCursorSuffix(
				nextLines.length - 1,
				activeCursor,
			);
			stream.write(
				returnPrefix +
					ansiEscapes.eraseLines(previousLines.length) +
					text +
					cursorSuffix,
			);
			wasCursorShown = activeCursor !== undefined;
			previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
			previousOutput = text;
			previousLines = nextLines;
			return true;
		}

		const hasTrailingNewline = text.endsWith('\n');

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

		buffer.push(returnPrefix);

		// Clear extra lines if the current content's line count is lower than the previous.
		if (visibleCount < previousVisible) {
			const didPreviousHaveTrailingNewline = previousOutput.endsWith('\n');
			const extraSlot = didPreviousHaveTrailingNewline ? 1 : 0;
			buffer.push(
				ansiEscapes.eraseLines(previousVisible - visibleCount + extraSlot),
				ansiEscapes.cursorUp(visibleCount),
			);
		} else if (previousLines.length > 1) {
			buffer.push(ansiEscapes.cursorUp(previousLines.length - 1));
		}

		for (let i = 0; i < visibleCount; i++) {
			const isLastLine = i === visibleCount - 1;

			// We do not write lines if the contents are the same. This prevents flickering during renders.
			// New blank rows need a line feed to scroll at the terminal bottom; the trailing split entry is not a visible row.
			if (i < previousVisible && nextLines[i] === previousLines[i]) {
				// Don't move past the last line when there's no trailing newline,
				// otherwise the cursor overshoots the rendered block.
				if (!isLastLine || hasTrailingNewline) {
					buffer.push(ansiEscapes.cursorNextLine);
				}

				continue;
			}

			const nextLine = nextLines[i]!;
			const changedLine =
				areColumnsUnchanged && nextLines.length === previousLines.length
					? lineUpdate(previousLines[i]!, nextLine, stream.columns)
					: ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + nextLine;

			buffer.push(
				changedLine +
					// Don't append newline after the last line when the input
					// has no trailing newline (fullscreen mode).
					(isLastLine && !hasTrailingNewline ? '' : '\n'),
			);
		}

		const cursorSuffix = buildCursorSuffix(nextLines.length - 1, activeCursor);
		buffer.push(cursorSuffix);

		stream.write(buffer.join(''));

		wasCursorShown = activeCursor !== undefined;
		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		previousOutput = text;
		previousLines = nextLines;
		return true;
	};

	render.clear = () => {
		stream.write(buildEraseFrame(previousLines.length, previousCursorPosition));
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		wasCursorShown = false;
	};

	render.done = () => {
		if (previousCursorPosition) {
			// Leave the terminal at the output bottom before discarding the cursor position.
			stream.write(
				buildReturnToBottom(previousLines.length, previousCursorPosition),
			);
		}

		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		wasCursorShown = false;

		if (showCursor) {
			return;
		}

		cliCursor.show(stream);
		hasHiddenCursor = false;
	};

	render.reset = () => {
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		wasCursorShown = false;
	};

	render.sync = (text: string) => {
		const activeCursor = isCursorDirty ? cursorPosition : undefined;
		isCursorDirty = false;

		previousColumns = stream.columns;
		const lines = text.split('\n');
		previousOutput = text;
		previousLines = lines;

		if (!activeCursor && wasCursorShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(buildCursorSuffix(lines.length - 1, activeCursor));
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		wasCursorShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
		isCursorDirty = true;
	};

	render.isCursorDirty = () => isCursorDirty;
	render.willRender = (text: string) => hasChanges(text, getActiveCursor());
	render.getCursorPosition = () => previousCursorPosition;

	return render;
};

const create = (
	stream: OutputStream,
	{showCursor = false, incremental = false} = {},
): LogUpdate =>
	incremental
		? createIncremental(stream, {showCursor})
		: createStandard(stream, {showCursor});

const logUpdate = {create};
export default logUpdate;
