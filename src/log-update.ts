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

		const previousLines = previousOutput.split('\n');
		const newLines = output.split('\n');
		let updateSequence = ansiEscapes.cursorUp(previousLineCount);

		newLines.forEach((line, index) => {
			const isPotentialRowUpdate = index < previousLines.length;
			if (isPotentialRowUpdate) {
				const previousChars = previousLines[index].split('');
				const newChars = line.split('');
				let cursor = 0;
				let i = 0;
				while (i < newChars.length) {
					const isNewChar = i < previousChars.length;
					const char = newChars[i];
					if (isNewChar) {
						updateSequence += char;
						cursor += 1;
					} else {
						const isSameChar = newChars[i] === previousChars[i];
						if (!isSameChar) {
							updateSequence += ansiEscapes.cursorMove(i - cursor);
							cursor = i;
						}
					}
					i++;
				}
			} else {
				updateSequence += line;
			}

			updateSequence += ansiEscapes.cursorDown() + ansiEscapes.cursorLeft;
		});

		if (previousLineCount > newLines.length) {
			updateSequence += ansiEscapes.eraseDown;
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
