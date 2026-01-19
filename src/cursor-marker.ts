import stripAnsi from 'strip-ansi';
import stringWidth from 'string-width';

/**
 * Cursor position marker (invisible ANSI control sequence).
 * SGR 999 is recognized but has no visual effect, excluded from layout calculations.
 */
export const CURSOR_MARKER = '\u001B[999m';

/**
 * Cursor position information.
 */
export type CursorPosition = {
	/** 0-indexed row number */
	row: number;
	/** 0-indexed column number (double-width chars = 2 cells) */
	col: number;
};

/**
 * Marker detection result.
 */
export type MarkerInfo = {
	/** Text with marker removed */
	cleaned: string;
	/** Marker position (undefined if not found) */
	position: CursorPosition | undefined;
};

/**
 * Detect and remove cursor marker from text, calculating its position.
 */
export function findAndRemoveMarker(text: string): MarkerInfo {
	const lines = text.split('\n');
	let position: CursorPosition | undefined;

	for (let row = 0; row < lines.length; row++) {
		const line = lines[row];
		if (!line) continue;

		const markerIndex = line.indexOf(CURSOR_MARKER);
		if (markerIndex >= 0) {
			// Calculate display width of text before marker (excluding ANSI sequences)
			const beforeMarker = line.slice(0, markerIndex);
			const col = stringWidth(stripAnsi(beforeMarker));

			position = {row, col};

			// Remove marker
			lines[row] = line.replace(CURSOR_MARKER, '');
			break;
		}
	}

	return {
		cleaned: lines.join('\n'),
		position,
	};
}

/**
 * Calculate cursor movement sequences from end position to target position.
 */
export function calculateCursorMovement(
	endRow: number,
	endCol: number,
	targetRow: number,
	targetCol: number,
): string {
	let movement = '';

	const rowDiff = targetRow - endRow;
	const colDiff = targetCol - endCol;

	// Vertical movement
	if (rowDiff > 0) {
		movement += `\u001B[${rowDiff}B`; // CUD - Cursor Down
	} else if (rowDiff < 0) {
		movement += `\u001B[${-rowDiff}A`; // CUU - Cursor Up
	}

	// Horizontal movement
	if (colDiff > 0) {
		movement += `\u001B[${colDiff}C`; // CUF - Cursor Forward
	} else if (colDiff < 0) {
		movement += `\u001B[${-colDiff}D`; // CUB - Cursor Back
	}

	return movement;
}
