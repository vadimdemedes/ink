import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	(str: string): void;
};

const create = (stream: Writable, {showCursor = false} = {}): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;

	function clear(): void {
		stream.write(ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
	}

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		if (str === '') {
			clear();
			return;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		const prevLines = previousOutput.split('\n');
		const newLines = output.split('\n');
		const newLinesCount = newLines.length;
		let updateSequence = '';

		// If new output is shorter than previous output, erase the extra lines.
		const numExtraOldLines = previousLineCount - newLinesCount;
		if (numExtraOldLines > 0) {
			// Note eraseLines() erases upwards.
			updateSequence += ansiEscapes.eraseLines(numExtraOldLines);
		}

		// Move back up to the start of previous output.
		updateSequence +=
			ansiEscapes.cursorUp(previousLineCount) + ansiEscapes.cursorLeft;

		newLines.forEach((newLine, index) => {
			if (newLine !== prevLines[index]) {
				updateSequence += newLine + ansiEscapes.eraseEndLine;
			}

			if (index < newLinesCount - 1) {
				// Note this could be more efficient if we used cursorDown() to move
				// multiple lines at once.
				updateSequence += ansiEscapes.cursorNextLine;
			}
		});

		stream.write(updateSequence);

		previousOutput = output;
		previousLineCount = newLinesCount;
	};

	render.clear = clear;

	render.done = () => {
		previousOutput = '';
		previousLineCount = 0;

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	return render;
};

const logUpdate = {create};
export default logUpdate;
