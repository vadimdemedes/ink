import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import type Ink from './ink.js';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

const createStandard = (
	inkInstance: Ink,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let hasHiddenCursor = false;

	const stream = inkInstance.options.stdout;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === inkInstance.lastOutput) {
			return;
		}

		inkInstance.lastOutput = output;
		stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
		previousLineCount = output.split('\n').length;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLineCount));
		previousLineCount = 0;
	};

	render.done = () => {
		inkInstance.lastOutput = '';
		previousLineCount = 0;

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		const output = str + '\n';
		inkInstance.lastOutput = output;
		previousLineCount = output.split('\n').length;
	};

	return render;
};

const createIncremental = (
	inkInstance: Ink,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let hasHiddenCursor = false;
	const stream = inkInstance.options.stdout;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === inkInstance.lastOutput) {
			return;
		}

		const previousCount = previousLines.length;
		const nextLines = output.split('\n');
		const nextCount = nextLines.length;
		const visibleCount = nextCount - 1;

		if (output === '\n' || inkInstance.lastOutput.length === 0) {
			stream.write(ansiEscapes.eraseLines(previousCount) + output);
			inkInstance.lastOutput = output;
			previousLines = nextLines;
			return;
		}

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

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

			buffer.push(ansiEscapes.eraseLine + nextLines[i] + '\n');
		}

		stream.write(buffer.join(''));

		inkInstance.lastOutput = output;
		previousLines = nextLines;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLines.length));
		previousLines = [];
	};

	render.done = () => {
		inkInstance.lastOutput = '';
		previousLines = [];

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		const output = str + '\n';
		inkInstance.lastOutput = output;
		previousLines = output.split('\n');
	};

	return render;
};

const create = (
	inkInstance: Ink,
	{showCursor = false, incremental = false} = {},
): LogUpdate => {
	if (incremental) {
		return createIncremental(inkInstance, {showCursor});
	}

	return createStandard(inkInstance, {showCursor});
};

const logUpdate = {create};
export default logUpdate;
