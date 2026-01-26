import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

const createStandard = (
	stream: Writable,
	{showCursor = false} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		// Detect if input already has trailing newline (automatic fullscreen detection)
		// If not, add one for proper cursor positioning in non-fullscreen mode
		const hasTrailingNewline = str.endsWith('\n');
		const output = hasTrailingNewline ? str : str + '\n';
		if (output === previousOutput) {
			return;
		}

		previousOutput = output;
		stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
		previousLineCount = output.split('\n').length;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
	};

	render.done = () => {
		// If the last output didn't have a trailing newline (fullscreen mode),
		// add one on exit so subsequent console output starts on a new line
		const needsTrailingNewline =
			previousOutput.length > 0 &&
			!previousOutput.endsWith('\n\n') &&
			!previousOutput.endsWith('\n');

		if (needsTrailingNewline) {
			stream.write('\n');
		}

		previousOutput = '';
		previousLineCount = 0;

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		const hasTrailingNewline = str.endsWith('\n');
		const output = hasTrailingNewline ? str : str + '\n';
		previousOutput = output;
		previousLineCount = output.split('\n').length;
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

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		// Detect if input already has trailing newline (automatic fullscreen detection)
		const hasTrailingNewline = str.endsWith('\n');
		const output = hasTrailingNewline ? str : str + '\n';
		if (output === previousOutput) {
			return;
		}

		const previousCount = previousLines.length;
		const nextLines = output.split('\n');
		const nextCount = nextLines.length;
		// In fullscreen mode (no trailing newline added), we count all lines as visible
		// In non-fullscreen mode, the last empty line from the added newline is not visible
		const visibleCount = hasTrailingNewline ? nextCount : nextCount - 1;

		const isEmptyNonFullscreen = !hasTrailingNewline && output === '\n';
		if (isEmptyNonFullscreen || previousOutput.length === 0) {
			stream.write(ansiEscapes.eraseLines(previousCount) + output);
			previousOutput = output;
			previousLines = nextLines;
			return;
		}

		// Detect if previous output had trailing newline
		const previousHadTrailingNewline =
			previousOutput.endsWith('\n') && !previousOutput.endsWith('\n\n');
		const previousVisibleCount = previousHadTrailingNewline
			? previousCount
			: previousCount - 1;

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
			buffer.push(ansiEscapes.cursorUp(Math.max(0, previousVisibleCount)));
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

		stream.write(buffer.join(''));

		previousOutput = output;
		previousLines = nextLines;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLines.length));
		previousOutput = '';
		previousLines = [];
	};

	render.done = () => {
		// If the last output didn't have a trailing newline (fullscreen mode),
		// add one on exit so subsequent console output starts on a new line
		const needsTrailingNewline =
			previousOutput.length > 0 &&
			!previousOutput.endsWith('\n\n') &&
			!previousOutput.endsWith('\n');

		if (needsTrailingNewline) {
			stream.write('\n');
		}

		previousOutput = '';
		previousLines = [];

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		const hasTrailingNewline = str.endsWith('\n');
		const output = hasTrailingNewline ? str : str + '\n';
		previousOutput = output;
		previousLines = output.split('\n');
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
