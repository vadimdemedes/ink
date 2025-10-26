import {type Writable} from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import cliCursor from 'cli-cursor';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';
import {findAndRemoveMarker} from './cursor-marker.js';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	sync: (str: string) => void;
	(str: string): void;
};

const create = (stream: Writable, {showCursor = false} = {}): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let isCursorVisible = false;
	let previousMarkerPosition: {row: number; col: number} | undefined;

	const render = (str: string) => {
		if (!showCursor && !hasHiddenCursor) {
			cliCursor.hide();
			hasHiddenCursor = true;
		}

		// When cursor control is disabled, use traditional rendering (no marker processing)
		if (!showCursor) {
			const output = str + '\n';
			if (output === previousOutput) {
				return;
			}

			previousOutput = output;
			stream.write(ansiEscapes.eraseLines(previousLineCount) + output);
			previousLineCount = output.split('\n').length;
			return;
		}

		// Detect and remove cursor marker
		const {cleaned, position} = findAndRemoveMarker(str);

		/**
		 * Border alignment fix for marker removal
		 *
		 * Problem: When we remove the marker character (U+E000), some terminals
		 * still reserve 1 cell of width for it, causing the right border │ to
		 * shift left by 1 character on the cursor line only.
		 *
		 * Solution: Insert a compensating space before the right border to push
		 * it back to the correct column, maintaining visual alignment across all lines.
		 *
		 * This is a workaround for terminal rendering inconsistencies where the
		 * marker character is not truly zero-width.
		 */
		let fixedCleaned = cleaned;
		if (position) {
			const lines = cleaned.split('\n');
			const cursorLine = lines[position.row];
			if (cursorLine) {
				// Find the last occurrence of │ (right border) and insert space before it
				const lastBorderIndex = cursorLine.lastIndexOf('│');
				let paddedLine: string;
				if (lastBorderIndex >= 0) {
					// Insert space before the right border
					paddedLine =
						cursorLine.slice(0, lastBorderIndex) +
						' ' +
						cursorLine.slice(lastBorderIndex);
				} else {
					// No border found, add space at the end
					paddedLine = cursorLine + ' ';
				}

				lines[position.row] = paddedLine;
				fixedCleaned = lines.join('\n');
			}
		}

		// When cursor is visible, remove any trailing newlines to keep cursor on input line
		// When cursor is hidden, ensure there's a trailing newline
		let output: string;
		if (showCursor) {
			// Remove trailing newlines when cursor is visible
			output = fixedCleaned.replace(/\n+$/, '');
		} else {
			// Ensure trailing newline when cursor is hidden
			output = fixedCleaned.endsWith('\n') ? fixedCleaned : fixedCleaned + '\n';
		}

		// Check if both output AND cursor position are unchanged
		const markerPositionChanged =
			position !== previousMarkerPosition &&
			!(
				position &&
				previousMarkerPosition &&
				position.row === previousMarkerPosition.row &&
				position.col === previousMarkerPosition.col
			);

		if (output === previousOutput && !markerPositionChanged) {
			return;
		}

		previousOutput = output;
		previousMarkerPosition = position ? {...position} : undefined;

		// Cursor control
		let cursorControl = '';

		if (showCursor) {
			// Only show cursor when we have position marker
			const shouldShowCursor = position !== undefined;

			// Only change cursor visibility when state changes
			if (shouldShowCursor && !isCursorVisible) {
				cursorControl += '\u001B[?25h'; // Show cursor
				isCursorVisible = true;
			} else if (!shouldShowCursor && isCursorVisible) {
				cursorControl += '\u001B[?25l'; // Hide cursor
				isCursorVisible = false;
			}

			// Move cursor to marker position using RELATIVE positioning only
			if (position) {
				// Calculate where cursor will be after writing output
				const lines = output.split('\n');
				const lastLine = lines.at(-1) ?? '';
				const endRow = lines.length - 1; // Relative to output start
				const endCol = stringWidth(stripAnsi(lastLine)); // Use stringWidth for multi-byte chars

				// Target position relative to output start
				const targetRow = position.row;
				const targetCol = position.col;

				// Calculate relative movement from end position
				const rowDiff = targetRow - endRow;
				const colDiff = targetCol - endCol;

				// Always perform relative cursor movement
				// Since we're only using relative commands, they will work regardless of scrolling
				// The terminal handles boundaries automatically

				// First move vertically
				if (rowDiff > 0) {
					// Move down
					cursorControl += `\u001B[${rowDiff}B`;
				} else if (rowDiff < 0) {
					// Move up
					cursorControl += `\u001B[${-rowDiff}A`;
				}

				// Then move horizontally
				if (colDiff > 0) {
					// Move right
					cursorControl += `\u001B[${colDiff}C`;
				} else if (colDiff < 0) {
					// Move left
					cursorControl += `\u001B[${-colDiff}D`;
				}
			}
		}

		// When cursor control is enabled, we need to handle cursor position carefully:
		// 1. Restore cursor to end of output (where it was saved last time)
		// 2. Erase previous output
		// 3. Write new output
		// 4. Save cursor position at end of output
		// 5. Move cursor to marker position
		let finalOutput = '';

		if (showCursor && position && previousMarkerPosition) {
			// Restore cursor to the end of output from last render
			// (only if we previously saved a position)
			finalOutput += '\u001B[u';
		}

		finalOutput += ansiEscapes.eraseLines(previousLineCount) + output;

		if (showCursor && position) {
			// Save cursor position at end of output
			finalOutput += '\u001B[s';
		}

		finalOutput += cursorControl;

		stream.write(finalOutput);

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

		if (!showCursor) {
			cliCursor.show();
			hasHiddenCursor = false;
		}

		// Always restore cursor visibility on exit
		if (!isCursorVisible) {
			stream.write('\u001B[?25h'); // Show cursor
			isCursorVisible = true;
		}
	};

	render.sync = (str: string) => {
		const output = showCursor ? str : str + '\n';
		previousOutput = output;
		previousLineCount = output.split('\n').length;
	};

	return render;
};

const logUpdate = {create};
export default logUpdate;
