import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import {type Position} from './output.js';

export type LogUpdate = {
	clear: () => void;
	clearTerminal: () => void;
	done: () => void;
	(str: string, cursorPosition: Position | undefined): void;
};

const create = (stream: Writable): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let previousCursorPosition: Position | undefined;
	let previousCursorOffsetY = 0;
	let hasHiddenCursor = false;

	const render = (str: string, cursorPosition: Position | undefined): void => {
		if (!hasHiddenCursor && cursorPosition === undefined) {
			cliCursor.hide();
			hasHiddenCursor = true;
		} else if (hasHiddenCursor && cursorPosition !== undefined) {
			cliCursor.show();
			hasHiddenCursor = false;
		}

		const output = str + '\n';
		if (
			output === previousOutput &&
			cursorPosition?.x === previousCursorPosition?.x &&
			cursorPosition?.y === previousCursorPosition?.y
		) {
			return;
		}

		const lineCount = output.split('\n').length;
		const cursorOffsetY = cursorPosition
			? lineCount - cursorPosition.y - 1 // -1 is for the last '\n'
			: 0;

		const moveCursorToBottom = previousCursorOffsetY
			? ansiEscapes.cursorDown(previousCursorOffsetY)
			: '';
		const eraseLines = ansiEscapes.eraseLines(previousLineCount);
		const moveCursorY = cursorOffsetY
			? ansiEscapes.cursorUp(cursorOffsetY)
			: '';
		const moveCursorX =
			cursorPosition === undefined
				? ''
				: ansiEscapes.cursorTo(cursorPosition.x);
		stream.write(
			moveCursorToBottom + eraseLines + output + moveCursorY + moveCursorX,
		);

		previousOutput = output;
		previousLineCount = lineCount;
		previousCursorPosition = cursorPosition;
		previousCursorOffsetY = cursorOffsetY;
	};

	render.clear = () => {
		const moveCursorToBottom = previousCursorOffsetY
			? ansiEscapes.cursorDown(previousCursorOffsetY)
			: '';
		const eraseLines = ansiEscapes.eraseLines(previousLineCount);
		stream.write(moveCursorToBottom + eraseLines);

		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		previousCursorOffsetY = 0;
	};

	render.clearTerminal = () => {
		stream.write(ansiEscapes.clearTerminal);

		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		previousCursorOffsetY = 0;
	};

	render.done = () => {
		if (previousCursorOffsetY) {
			stream.write(ansiEscapes.cursorDown(previousCursorOffsetY));
		}

		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		previousCursorOffsetY = 0;

		if (hasHiddenCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	return render;
};

const logUpdate = {create};
export default logUpdate;
