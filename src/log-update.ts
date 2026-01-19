import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import stripAnsi from 'strip-ansi';
import stringWidth from 'string-width';
import {
	findAndRemoveMarker,
	calculateCursorMovement,
	type CursorPosition,
} from './cursor-marker.js';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

export type LogUpdateOptions = {
	showCursor?: boolean;
	incremental?: boolean;
	/**
	 * Enable IME cursor position control.
	 * When enabled, the terminal's real cursor will move to the input position,
	 * allowing IME candidate windows to display at the correct position (required for CJK input).
	 * @default false
	 */
	enableImeCursor?: boolean;
};

const createStandard = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let previousMarkerPosition: CursorPosition | undefined;

	const render = (str: string) => {
		// Handle IME cursor mode
		if (enableImeCursor) {
			const {cleaned, position} = findAndRemoveMarker(str);
			const output = cleaned + '\n';

			// Check if position changed
			const positionChanged =
				position !== previousMarkerPosition &&
				!(
					position &&
					previousMarkerPosition &&
					position.row === previousMarkerPosition.row &&
					position.col === previousMarkerPosition.col
				);

			// Skip if nothing changed
			if (output === previousOutput && !positionChanged) {
				return;
			}

			previousOutput = output;
			previousMarkerPosition = position ? {...position} : undefined;

			// Build cursor control sequences
			let cursorControl = '';
			const shouldShowCursor = position !== undefined;

			// Show/hide cursor based on marker presence
			if (shouldShowCursor && !hasHiddenCursor) {
				// Actually we want to SHOW the cursor when IME is active
				cliCursor.show();
			} else if (!shouldShowCursor && hasHiddenCursor) {
				cliCursor.hide();
			}

			hasHiddenCursor = !shouldShowCursor;

			// Calculate cursor movement to marker position
			if (position) {
				const lines = cleaned.split('\n');
				const lastLine = lines.at(-1) ?? '';
				const endRow = lines.length - 1;
				const endCol = stringWidth(stripAnsi(lastLine));

				cursorControl = calculateCursorMovement(
					endRow,
					endCol,
					position.row,
					position.col,
				);
			}

			// Write output then move cursor
			stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
			if (cursorControl) {
				stream.write(cursorControl);
			}

			previousLineCount = output.split('\n').length;
			return;
		}

		// Original behavior when IME cursor is disabled
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		const output = str + '\n';
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
		previousOutput = '';
		previousLineCount = 0;
		previousMarkerPosition = undefined;

		if (!showCursor || enableImeCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		if (enableImeCursor) {
			const {cleaned, position} = findAndRemoveMarker(str);
			const output = cleaned + '\n';
			previousOutput = output;
			previousLineCount = output.split('\n').length;
			previousMarkerPosition = position ? {...position} : undefined;
		} else {
			const output = str + '\n';
			previousOutput = output;
			previousLineCount = output.split('\n').length;
		}
	};

	return render;
};

const createIncremental = (
	stream: Writable,
	{showCursor = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;
	let previousMarkerPosition: CursorPosition | undefined;

	const render = (str: string) => {
		// Handle IME cursor mode
		if (enableImeCursor) {
			const {cleaned, position} = findAndRemoveMarker(str);
			const output = cleaned + '\n';

			// Check if position changed
			const positionChanged =
				position !== previousMarkerPosition &&
				!(
					position &&
					previousMarkerPosition &&
					position.row === previousMarkerPosition.row &&
					position.col === previousMarkerPosition.col
				);

			if (output === previousOutput && !positionChanged) {
				return;
			}

			const shouldShowCursor = position !== undefined;

			if (shouldShowCursor && !hasHiddenCursor) {
				cliCursor.show();
			} else if (!shouldShowCursor && hasHiddenCursor) {
				cliCursor.hide();
			}

			hasHiddenCursor = !shouldShowCursor;

			const previousCount = previousLines.length;
			const nextLines = output.split('\n');
			const nextCount = nextLines.length;
			const visibleCount = nextCount - 1;

			if (output === '\n' || previousOutput.length === 0) {
				stream.write(ansiEscapes.eraseLines(previousCount) + output);
				previousOutput = output;
				previousLines = nextLines;
				previousMarkerPosition = position ? {...position} : undefined;

				// Move cursor to marker position
				if (position) {
					const lines = cleaned.split('\n');
					const lastLine = lines.at(-1) ?? '';
					const endRow = lines.length - 1;
					const endCol = stringWidth(stripAnsi(lastLine));
					stream.write(
						calculateCursorMovement(endRow, endCol, position.row, position.col),
					);
				}

				return;
			}

			const buffer: string[] = [];

			if (nextCount < previousCount) {
				buffer.push(
					ansiEscapes.eraseLines(previousCount - nextCount + 1),
					ansiEscapes.cursorUp(visibleCount),
				);
			} else {
				buffer.push(ansiEscapes.cursorUp(previousCount - 1));
			}

			for (let i = 0; i < visibleCount; i++) {
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

			// Move cursor to marker position
			if (position) {
				const lines = cleaned.split('\n');
				const lastLine = lines.at(-1) ?? '';
				const endRow = lines.length - 1;
				const endCol = stringWidth(stripAnsi(lastLine));
				stream.write(
					calculateCursorMovement(endRow, endCol, position.row, position.col),
				);
			}

			previousOutput = output;
			previousLines = nextLines;
			previousMarkerPosition = position ? {...position} : undefined;
			return;
		}

		// Original behavior
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
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
		previousOutput = '';
		previousLines = [];
		previousMarkerPosition = undefined;

		if (!showCursor || enableImeCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}
	};

	render.sync = (str: string) => {
		if (enableImeCursor) {
			const {cleaned, position} = findAndRemoveMarker(str);
			const output = cleaned + '\n';
			previousOutput = output;
			previousLines = output.split('\n');
			previousMarkerPosition = position ? {...position} : undefined;
		} else {
			const output = str + '\n';
			previousOutput = output;
			previousLines = output.split('\n');
		}
	};

	return render;
};

const create = (
	stream: Writable,
	{showCursor = false, incremental = false, enableImeCursor = false}: LogUpdateOptions = {},
): LogUpdate => {
	if (incremental) {
		return createIncremental(stream, {showCursor, enableImeCursor});
	}

	return createStandard(stream, {showCursor, enableImeCursor});
};

const logUpdate = {create};
export default logUpdate;
