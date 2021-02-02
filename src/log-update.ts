import {Writable} from 'stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

export interface LogUpdate {
	clear: () => void;
	done: () => void;
	(str: string): void;
}

const create = (stream: Writable, {showCursor = false} = {}): LogUpdate => {
	let previousLineCount = 0;
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
		let updateSequence = ansiEscapes.cursorUp(previousLineCount);

		newLines.forEach(line => {
			updateSequence += ansiEscapes.eraseLine + line;
			updateSequence += ansiEscapes.cursorDown() + ansiEscapes.cursorTo(0);
		});

		if (previousLineCount > newLines.length) {
			updateSequence += ansiEscapes.eraseLines(
				previousLineCount - newLines.length
			);
		}

		stream.write(updateSequence);
		previousLineCount = newLines.length;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
	};

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

export default {create};
