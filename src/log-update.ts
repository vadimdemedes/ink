import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import {
	type CursorPosition,
	cursorPositionChanged,
	buildCursorSuffix,
	buildCursorOnlySequence,
	buildReturnToBottomPrefix,
} from './cursor-helpers.js';

export type {CursorPosition} from './cursor-helpers.js';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	(str: string): void;
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
		const cursorChanged = cursorPositionChanged(
			cursorPosition,
			previousCursorPosition,
		);

		if (output === previousOutput && !cursorChanged) {
			return;
		}

		const visibleLineCount = output.split('\n').length - 1;
		const cursorSuffix = buildCursorSuffix(visibleLineCount, cursorPosition);

		if (output === previousOutput && cursorChanged) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown,
					previousLineCount,
					previousCursorPosition,
					visibleLineCount,
					cursorPosition,
				}),
			);
		} else {
			previousOutput = output;
			const returnPrefix = buildReturnToBottomPrefix(
				cursorWasShown,
				previousLineCount,
				previousCursorPosition,
			);
			stream.write(
				returnPrefix +
					ansiEscapes.eraseLines(previousLineCount) +
					output +
					cursorSuffix,
			);
			previousLineCount = output.split('\n').length;
		}

		previousCursorPosition = cursorPosition ? {...cursorPosition} : undefined;
		cursorWasShown = cursorPosition !== undefined;
	};

	render.clear = () => {
		const prefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLineCount,
			previousCursorPosition,
		);
		stream.write(
			prefix + ansiEscapes.eraseLines(previousLineCount),
		);
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
		const cursorChanged = cursorPositionChanged(
			cursorPosition,
			previousCursorPosition,
		);

		if (output === previousOutput && !cursorChanged) {
			return;
		}

		const previousCount = previousLines.length;
		const nextLines = output.split('\n');
		const nextCount = nextLines.length;
		const visibleCount = nextCount - 1;

		if (output === previousOutput && cursorChanged) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown,
					previousLineCount: previousCount,
					previousCursorPosition,
					visibleLineCount: visibleCount,
					cursorPosition,
				}),
			);
			previousCursorPosition = cursorPosition ? {...cursorPosition} : undefined;
			cursorWasShown = cursorPosition !== undefined;
			return;
		}

		const returnPrefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousCount,
			previousCursorPosition,
		);

		if (output === '\n' || previousOutput.length === 0) {
			const cursorSuffix = buildCursorSuffix(visibleCount, cursorPosition);
			stream.write(
				returnPrefix +
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

		buffer.push(returnPrefix);

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

		stream.write(buffer.join(''));

		cursorWasShown = cursorPosition !== undefined;
		previousCursorPosition = cursorPosition ? {...cursorPosition} : undefined;
		previousOutput = output;
		previousLines = nextLines;
	};

	render.clear = () => {
		const prefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLines.length,
			previousCursorPosition,
		);
		stream.write(
			prefix + ansiEscapes.eraseLines(previousLines.length),
		);
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
