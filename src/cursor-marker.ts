/**
 * Non-standard SGR sequence. Most terminals ignore it visually
 * (no color or style change). Used as an inline marker during rendering
 * that gets replaced with real cursor positioning before stdout write.
 */
export const CURSOR_MARKER = '\u001B[999m';

const SAVE_CURSOR = '\u001B[s';

type ReplacementResult = {
	output: string;
	hasCursor: boolean;
};

/**
 * Replaces the first occurrence of CURSOR_MARKER with ESC[s (Save Cursor Position),
 * and strips any subsequent occurrences.
 */
export function replaceCursorMarker(input: string): ReplacementResult {
	const firstIndex = input.indexOf(CURSOR_MARKER);

	if (firstIndex === -1) {
		return {output: input, hasCursor: false};
	}

	// Replace first occurrence with save-cursor, strip the rest
	const output =
		input.substring(0, firstIndex) +
		SAVE_CURSOR +
		input
			.substring(firstIndex + CURSOR_MARKER.length)
			.replaceAll(CURSOR_MARKER, '');

	return {output, hasCursor: true};
}
