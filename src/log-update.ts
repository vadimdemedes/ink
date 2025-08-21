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

		const newLines = output.split('\n');
		const oldLines = previousLines;

		// Find the first line that differs
		let firstDifferentLine = -1;
		const minLength = Math.min(newLines.length, oldLines.length);

		for (let i = 0; i < minLength; i++) {
			if (newLines[i] !== oldLines[i]) {
				firstDifferentLine = i;
				break;
			}
		}

		// If all compared lines are the same but counts differ
		if (firstDifferentLine === -1 && newLines.length !== oldLines.length) {
			firstDifferentLine = minLength;
		}

		// If everything is identical, nothing to do
		if (firstDifferentLine === -1) {
			previousOutput = output;
			previousLines = newLines;
			return;
		}

		// Move cursor up to the first different line
		const linesToMoveUp = oldLines.length - firstDifferentLine;
		if (linesToMoveUp > 0) {
			stream.write(ansiEscapes.cursorUp(linesToMoveUp));
		}

		// Write all lines from the first different one
		for (let i = firstDifferentLine; i < newLines.length; i++) {
			if (i > firstDifferentLine) {
				stream.write('\n');
			}
			stream.write(ansiEscapes.eraseLine + newLines[i]);
		}

		// Clear any extra lines if new output is shorter
		if (oldLines.length > newLines.length) {
			for (let i = newLines.length; i < oldLines.length; i++) {
				stream.write('\n' + ansiEscapes.eraseLine);
			}
			// Move cursor back up to the end of new content
			const extraLines = oldLines.length - newLines.length;
			if (extraLines > 0) {
				stream.write(ansiEscapes.cursorUp(extraLines));
			}
		}

		stream.write('\n');

		previousOutput = output;
		previousLines = newLines;
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
