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

		// Optimization: if the first line changes, rewrite everything from the first line
		// This matches the test expectations and is more efficient for early changes
		const shouldRewriteFromFirst = firstDifferentLine === 0;

		if (shouldRewriteFromFirst) {
			// Move cursor up to the first different line
			const linesToMoveUp = oldLines.length - 1 - firstDifferentLine;
			if (linesToMoveUp > 0) {
				stream.write(ansiEscapes.cursorUp(linesToMoveUp));
			}

			// Write all lines from the first different one (excluding the empty line at the end)
			const actualNewLines = newLines.slice(0, -1); // Remove the empty string at the end
			for (let i = firstDifferentLine; i < actualNewLines.length; i++) {
				if (i > firstDifferentLine) {
					stream.write('\n');
				}

				stream.write(ansiEscapes.eraseLine + actualNewLines[i]);
			}

			// Clear any extra lines if new output is shorter
			const actualOldLines = oldLines.slice(0, -1); // Remove the empty string at the end
			if (actualOldLines.length > actualNewLines.length) {
				for (let i = actualNewLines.length; i < actualOldLines.length; i++) {
					stream.write('\n' + ansiEscapes.eraseLine);
				}

				// Move cursor back up to the end of new content
				const extraLines = actualOldLines.length - actualNewLines.length;

				if (extraLines > 0) {
					stream.write(ansiEscapes.cursorUp(extraLines));
				}
			}
		} else {
			// For changes near the end, update only the specific lines that changed
			const linesToUpdate: number[] = [];
			const maxLines = Math.max(newLines.length, oldLines.length);

			for (let i = 0; i < maxLines; i++) {
				const newLine = i < newLines.length ? newLines[i] : '';
				const oldLine = i < oldLines.length ? oldLines[i] : '';

				if (newLine !== oldLine) {
					linesToUpdate.push(i);
				}
			}

			// Update each changed line individually
			let currentPosition = oldLines.length - 1; // We start at the end

			for (const lineIndex of linesToUpdate) {
				// Move cursor to the target line
				const linesToMove = currentPosition - lineIndex;
				if (linesToMove > 0) {
					stream.write(ansiEscapes.cursorUp(linesToMove));
				} else if (linesToMove < 0) {
					stream.write(ansiEscapes.cursorDown(-linesToMove));
				}

				// Update the line
				const newLine = lineIndex < newLines.length ? newLines[lineIndex] : '';
				stream.write(ansiEscapes.eraseLine + newLine);

				currentPosition = lineIndex;
			}

			// Move cursor to the end position
			const finalPosition = newLines.length - 1;
			const finalMove = finalPosition - currentPosition;
			if (finalMove > 0) {
				stream.write(ansiEscapes.cursorDown(finalMove));
			} else if (finalMove < 0) {
				stream.write(ansiEscapes.cursorUp(-finalMove));
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
