/**
 * Cursor position marker for IME support
 *
 * This module provides a marker-based cursor positioning system that allows
 * React components to specify where the terminal cursor should be placed.
 * This is essential for IME (Input Method Editor) support, as the IME
 * candidate window needs to appear at the correct cursor position.
 */

import stripAnsi from 'strip-ansi';
import stringWidth from 'string-width';

/**
 * Cursor position marker (ANSI escape sequence)
 *
 * This invisible ANSI escape sequence is used to mark where the terminal cursor
 * should be positioned in the rendered output. It's essential for IME (Input Method Editor)
 * support, as the IME candidate window needs to appear at the correct cursor position.
 *
 * Using SGR 999 (undefined parameter) which is recognized by ansi-tokenize but has no visual effect.
 * This sequence does not interfere with existing text styles (color, bold, etc.) and is automatically
 * excluded from width calculations and removed during tokenization, ensuring accurate layout.
 *
 * @example
 * ```tsx
 * import {CURSOR_MARKER} from 'ink/cursor-marker';
 *
 * // Place marker before cursor position
 * <Text>{beforeText}{CURSOR_MARKER}<Text inverse>{cursorChar}</Text>{afterText}</Text>
 * ```
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CURSOR_MARKER = '\u001B[999m';

/**
 * Cursor position in the output
 */
export type CursorPosition = {
	row: number; // 0-indexed line number
	col: number; // 0-indexed column number in cells (full-width char = 2 cells)
};

/**
 * Result of marker detection
 */
export type MarkerInfo = {
	cleaned: string; // Text with marker removed
	position: CursorPosition | undefined; // Cursor position (undefined if no marker)
};

/**
 * Find and remove the cursor marker from text
 *
 * @param text - Input text that may contain a cursor marker
 * @returns MarkerInfo with cleaned text and cursor position
 */
export function findAndRemoveMarker(text: string): MarkerInfo {
	const lines = text.split('\n');
	let position: CursorPosition | undefined;

	// Search for the marker
	for (let row = 0; row < lines.length; row++) {
		const line = lines[row];
		if (!line) continue;

		const markerIndex = line.indexOf(CURSOR_MARKER);
		if (markerIndex >= 0) {
			// Calculate visual width before the marker (excluding ANSI sequences)
			const beforeMarker = line.slice(0, markerIndex);
			const col = stringWidth(stripAnsi(beforeMarker));

			position = {row, col};

			// Replace marker with empty string
			// Note: Some terminals may render the marker character with width 1,
			// but we rely on Yoga's measureText to handle this correctly
			lines[row] = line.replace(CURSOR_MARKER, '');
			break;
		}
	}

	return {
		cleaned: lines.join('\n'),
		position,
	};
}
