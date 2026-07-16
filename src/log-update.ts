import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import {
	type CursorPosition,
	type CursorShape,
	cursorPositionChanged,
	cursorShapeChanged,
	buildCursorShapeEscape,
	buildCursorSuffix,
	buildCursorOnlySequence,
	buildReturnToBottomPrefix,
	hideCursorEscape,
	resetCursorShapeEscape,
} from './cursor-helpers.js';

export type {CursorPosition, CursorShape} from './cursor-helpers.js';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	reset: () => void;
	sync: (str: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	setCursorShape: (shape: CursorShape | undefined) => void;
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
	{showCursor = false} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let cursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;
	let cursorShape: CursorShape | undefined;
	let shapeDirty = false;
	let previousShape: CursorShape | undefined;
	let hasEmittedShape = false;

	const getActiveCursor = () => (cursorDirty ? cursorPosition : undefined);
	const getActiveShape = () => (shapeDirty ? cursorShape : undefined);
	const hasChanges = (
		str: string,
		activeCursor: CursorPosition | undefined,
		activeShape: CursorShape | undefined,
	): boolean => {
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		const shapeChanged = cursorShapeChanged(activeShape, previousShape);
		return str !== previousOutput || cursorChanged || shapeChanged;
	};

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		const activeShape = getActiveShape();
		cursorDirty = false;
		shapeDirty = false;
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		const shapeChanged = cursorShapeChanged(activeShape, previousShape);

		if (!hasChanges(str, activeCursor, activeShape)) {
			return false;
		}

		const lines = str.split('\n');
		const visibleCount = visibleLineCount(lines, str);
		const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);
		const shapePrefix = shapeChanged ? buildCursorShapeEscape(activeShape) : '';
		if (shapePrefix !== '') {
			hasEmittedShape = true;
		}

		if (str === previousOutput && cursorChanged) {
			stream.write(
				shapePrefix +
					buildCursorOnlySequence({
						cursorWasShown,
						previousLineCount,
						previousCursorPosition,
						visibleLineCount: visibleCount,
						cursorPosition: activeCursor,
					}),
			);
		} else if (str === previousOutput && shapeChanged) {
			stream.write(shapePrefix);
		} else {
			previousOutput = str;
			const returnPrefix = buildReturnToBottomPrefix(
				cursorWasShown,
				previousLineCount,
				previousCursorPosition,
			);
			stream.write(
				shapePrefix +
					returnPrefix +
					ansiEscapes.eraseLines(previousLineCount) +
					str +
					cursorSuffix,
			);
			previousLineCount = lines.length;
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		previousShape = activeShape;
		cursorWasShown = activeCursor !== undefined;
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
		previousShape = undefined;
	};

	render.done = () => {
		// Restore the terminal's default cursor shape if we ever changed it.
		// Terminals that don't implement DECSCUSR ignore this byte sequence.
		if (hasEmittedShape) {
			stream.write(resetCursorShapeEscape);
			hasEmittedShape = false;
		}

		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		cursorWasShown = false;
		previousShape = undefined;

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
		previousShape = undefined;
	};

	render.sync = (str: string) => {
		const activeCursor = cursorDirty ? cursorPosition : undefined;
		const activeShape = shapeDirty ? cursorShape : undefined;
		const shapeChanged = cursorShapeChanged(activeShape, previousShape);
		cursorDirty = false;
		shapeDirty = false;

		const lines = str.split('\n');
		previousOutput = str;
		previousLineCount = lines.length;

		// Emit shape escape during sync paths (e.g. fullscreen / clearTerminal
		// in ink.tsx) so the user's requested shape survives that branch.
		if (shapeChanged) {
			const shapeEscape = buildCursorShapeEscape(activeShape);
			if (shapeEscape !== '') {
				stream.write(shapeEscape);
				hasEmittedShape = true;
			}
		}

		if (!activeCursor && cursorWasShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(
				buildCursorSuffix(visibleLineCount(lines, str), activeCursor),
			);
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		previousShape = activeShape;
		cursorWasShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
		cursorDirty = true;
	};

	render.setCursorShape = (shape: CursorShape | undefined) => {
		cursorShape = shape;
		shapeDirty = true;
	};

	render.isCursorDirty = () => cursorDirty || shapeDirty;
	render.willRender = (str: string) =>
		hasChanges(str, getActiveCursor(), getActiveShape());

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
	let cursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;
	let cursorShape: CursorShape | undefined;
	let shapeDirty = false;
	let previousShape: CursorShape | undefined;
	// Tracks whether this session has ever emitted a DECSCUSR escape. When
	// true, done() must emit a reset so the terminal doesn't keep our shape
	// after Ink exits.
	let hasEmittedShape = false;

	const getActiveCursor = () => (cursorDirty ? cursorPosition : undefined);
	const getActiveShape = () => (shapeDirty ? cursorShape : undefined);
	const hasChanges = (
		str: string,
		activeCursor: CursorPosition | undefined,
		activeShape: CursorShape | undefined,
	): boolean => {
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		const shapeChanged = cursorShapeChanged(activeShape, previousShape);
		return str !== previousOutput || cursorChanged || shapeChanged;
	};

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		const activeShape = getActiveShape();
		cursorDirty = false;
		shapeDirty = false;
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		const shapeChanged = cursorShapeChanged(activeShape, previousShape);

		if (!hasChanges(str, activeCursor, activeShape)) {
			return false;
		}

		const nextLines = str.split('\n');
		const visibleCount = visibleLineCount(nextLines, str);
		const previousVisible = visibleLineCount(previousLines, previousOutput);
		const shapePrefix = shapeChanged ? buildCursorShapeEscape(activeShape) : '';
		if (shapePrefix !== '') {
			hasEmittedShape = true;
		}

		if (str === previousOutput && cursorChanged) {
			stream.write(
				shapePrefix +
					buildCursorOnlySequence({
						cursorWasShown,
						previousLineCount: previousLines.length,
						previousCursorPosition,
						visibleLineCount: visibleCount,
						cursorPosition: activeCursor,
					}),
			);
			previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
			previousShape = activeShape;
			cursorWasShown = activeCursor !== undefined;
			return true;
		}

		if (str === previousOutput && shapeChanged) {
			stream.write(shapePrefix);
			previousShape = activeShape;
			return true;
		}

		const returnPrefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLines.length,
			previousCursorPosition,
		);

		if (str === '\n' || previousOutput.length === 0) {
			const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);
			stream.write(
				shapePrefix +
					returnPrefix +
					ansiEscapes.eraseLines(previousLines.length) +
					str +
					cursorSuffix,
			);
			cursorWasShown = activeCursor !== undefined;
			previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
			previousShape = activeShape;
			previousOutput = str;
			previousLines = nextLines;
			return true;
		}

		const hasTrailingNewline = str.endsWith('\n');

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

		buffer.push(shapePrefix, returnPrefix);

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

		const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);
		buffer.push(cursorSuffix);

		stream.write(buffer.join(''));

		cursorWasShown = activeCursor !== undefined;
		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		previousShape = activeShape;
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
		previousShape = undefined;
	};

	render.done = () => {
		// Restore the terminal's default cursor shape if we ever changed it.
		// Terminals that don't implement DECSCUSR ignore this byte sequence.
		if (hasEmittedShape) {
			stream.write(resetCursorShapeEscape);
			hasEmittedShape = false;
		}

		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		cursorWasShown = false;
		previousShape = undefined;

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
		previousShape = undefined;
	};

	render.sync = (str: string) => {
		const activeCursor = cursorDirty ? cursorPosition : undefined;
		const activeShape = shapeDirty ? cursorShape : undefined;
		const shapeChanged = cursorShapeChanged(activeShape, previousShape);
		cursorDirty = false;
		shapeDirty = false;

		const lines = str.split('\n');
		previousOutput = str;
		previousLines = lines;

		// Emit shape escape during sync paths (e.g. fullscreen / clearTerminal
		// in ink.tsx) so the user's requested shape survives that branch.
		if (shapeChanged) {
			const shapeEscape = buildCursorShapeEscape(activeShape);
			if (shapeEscape !== '') {
				stream.write(shapeEscape);
				hasEmittedShape = true;
			}
		}

		if (!activeCursor && cursorWasShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(
				buildCursorSuffix(visibleLineCount(lines, str), activeCursor),
			);
		}

		previousCursorPosition = activeCursor ? {...activeCursor} : undefined;
		previousShape = activeShape;
		cursorWasShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined) => {
		cursorPosition = position;
		cursorDirty = true;
	};

	render.setCursorShape = (shape: CursorShape | undefined) => {
		cursorShape = shape;
		shapeDirty = true;
	};

	render.isCursorDirty = () => cursorDirty || shapeDirty;
	render.willRender = (str: string) =>
		hasChanges(str, getActiveCursor(), getActiveShape());

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
