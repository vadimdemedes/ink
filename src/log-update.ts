import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

const create = (stream: Writable, {showCursor = false} = {}): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		const previousLineCount = previousLines.length;
		const lines = output.split('\n');
		const lineCount = lines.length;

		if (lineCount === 0 || previousLineCount === 0) {
			stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
			previousOutput = output;
			previousLines = lines;
			return;
		}

		// We aggregate all chunks for incremental rendering into a buffer, and then write them to stdout at the end.
		const buffer: string[] = [];

		// Clear extra lines if the current content's line count is lower than the previous.
		if (lineCount < previousLineCount) {
			buffer.push(
				ansiEscapes.eraseLines(previousLineCount - lineCount + 1),
				ansiEscapes.cursorUp(lineCount - 1),
			);
		} else {
			buffer.push(ansiEscapes.cursorUp(previousLineCount - 1));
		}

		for (let i = 0; i < lineCount - 1; i++) {
			// We do not write lines if the contents are the same. This prevents flickering during renders.
			if (lines[i] === previousLines[i]) {
				buffer.push(ansiEscapes.cursorNextLine);
				continue;
			}

			buffer.push(ansiEscapes.eraseLine + (lines[i] ?? '') + '\n');
		}

		stream.write(buffer.join(''));

		previousOutput = output;
		previousLines = lines;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLines.length));
		previousOutput = '';
		previousLines = [];
	};

	render.done = () => {
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

	return render;
};

const logUpdate = {create};
export default logUpdate;
