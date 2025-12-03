import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';

export type CursorPosition = {
	row: number;
	col: number;
};

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string, cursorPosition?: CursorPosition) => void;
	(str: string, cursorPosition?: CursorPosition): void;
};

const createStandard = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false} = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let isFirstRender = true;
	let previousCursorPosition: CursorPosition | undefined;

	// IME cursor mode: Show terminal cursor once during initialization
	if (enableImeCursor) {
		cliCursor.show(stream);
	}

	const render = (str: string, cursorPosition?: CursorPosition) => {
		if (!enableImeCursor && !showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		const output = str + '\n';

		const cursorChanged = enableImeCursor && cursorPosition && previousCursorPosition &&
			(cursorPosition.row !== previousCursorPosition.row || cursorPosition.col !== previousCursorPosition.col);

		if (output === previousOutput) {
			// Output is the same, but cursor position may have changed
			if (cursorChanged) {
				let buffer = '';

				const colDiff = cursorPosition!.col - previousCursorPosition!.col;
				if (colDiff > 0) {
					buffer += ansiEscapes.cursorForward(colDiff);
				} else if (colDiff < 0) {
					buffer += ansiEscapes.cursorBackward(-colDiff);
				}

				const rowDiff = cursorPosition!.row - previousCursorPosition!.row;
				if (rowDiff > 0) {
					buffer += ansiEscapes.cursorDown(rowDiff);
				} else if (rowDiff < 0) {
					buffer += ansiEscapes.cursorUp(-rowDiff);
				}

				previousCursorPosition = cursorPosition;
				stream.write(buffer);
			}
			return;
		}

		const lineCount = output.split('\n').length;
		let buffer = '';

		if (enableImeCursor && cursorPosition) {
			if (!isFirstRender && previousCursorPosition) {
				const moveDown = previousLineCount - 1 - previousCursorPosition.row;
				if (moveDown > 0) {
					buffer += ansiEscapes.cursorDown(moveDown);
				}
				buffer += ansiEscapes.eraseLines(previousLineCount);
			}

			buffer += ansiEscapes.cursorShow;
			buffer += output;
			isFirstRender = false;

			// Calculate relative distance within output, regardless of scroll
			const moveUp = (lineCount - 1) - cursorPosition.row;

			if (moveUp > 0) {
				buffer += ansiEscapes.cursorUp(moveUp);
			}

			buffer += ansiEscapes.cursorTo(cursorPosition.col);
			buffer += ansiEscapes.cursorShow;

			previousCursorPosition = cursorPosition;
		} else {
			buffer = ansiEscapes.eraseLines(previousLineCount) + output;
		}

		previousOutput = output;
		previousLineCount = lineCount;

		stream.write(buffer);
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
			cliCursor.show(stream);
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string, _cursorPosition?: CursorPosition) => {
		const output = str + '\n';
		previousOutput = output;
		previousLineCount = output.split('\n').length;
	};

	return render;
};

const createIncremental = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false} = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;

	// IME cursor mode: Show terminal cursor once during initialization
	if (enableImeCursor) {
		cliCursor.show(stream);
	}

	const render = (str: string, cursorPosition?: CursorPosition) => {
		if (!enableImeCursor && !showCursor && !hasHiddenCursor) {
			cliCursor.hide(stream);
			hasHiddenCursor = true;
		}

		const output = str + '\n';
		if (output === previousOutput) {
			return;
		}

		const previousCount = previousLines.length;
		const nextLines = output.split('\n');
		const nextCount = nextLines.length;
		const visibleCount = nextCount - 1;

		if (enableImeCursor && cursorPosition) {
			let buffer = '';

			if (output === '\n' || previousOutput.length === 0) {
				// First rendering
				buffer += output;
				buffer += ansiEscapes.cursorSavePosition;
			} else {
				// Incremental rendering after cursor restore
				buffer += ansiEscapes.cursorRestorePosition;

				if (nextCount < previousCount) {
					buffer += ansiEscapes.eraseLines(previousCount - nextCount + 1);
					buffer += ansiEscapes.cursorUp(visibleCount);
				} else {
					buffer += ansiEscapes.cursorUp(previousCount - 1);
				}

				for (let i = 0; i < visibleCount; i++) {
					if (nextLines[i] === previousLines[i]) {
						buffer += ansiEscapes.cursorNextLine;
						continue;
					}

					buffer += ansiEscapes.eraseLine + nextLines[i] + '\n';
				}

				buffer += ansiEscapes.cursorSavePosition;
			}

			// Move cursor to specified position
			const moveUp = visibleCount - cursorPosition.row;
			buffer += (moveUp > 0 ? ansiEscapes.cursorUp(moveUp) : '');
			buffer += ansiEscapes.cursorTo(cursorPosition.col);

			stream.write(buffer);
			previousOutput = output;
			previousLines = nextLines;
			return;
		}

		if (output === '\n' || previousOutput.length === 0) {
			stream.write(ansiEscapes.eraseLines(previousCount) + output);
			previousOutput = output;
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

		previousOutput = output;
		previousLines = nextLines;
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
			cliCursor.show(stream);
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string, _cursorPosition?: CursorPosition) => {
		const output = str + '\n';
		previousOutput = output;
		previousLines = output.split('\n');
	};

	return render;
};

const create = (
	stream: Writable,
	{showCursor = false, incremental = false, enableImeCursor = false} = {},
): LogUpdate => {
	if (incremental) {
		return createIncremental(stream, {showCursor, enableImeCursor});
	}

	return createStandard(stream, {showCursor, enableImeCursor});
};

const logUpdate = {create};
export default logUpdate;
