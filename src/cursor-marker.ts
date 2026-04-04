/**
 * Non-standard SGR sequence. Most terminals ignore it visually
 * (no color or style change). Used as an inline marker during rendering
 * that gets replaced with real cursor positioning before stdout write.
 */
export const cursorMarker = '\u001B[999m';

const saveCursor = '\u001B[s';

type ReplacementResult = {
	output: string;
	hasCursor: boolean;
};

/**
 * Replaces the first occurrence of cursorMarker with ESC[s (Save Cursor Position),
 * and strips any subsequent occurrences.
 */
export function replaceCursorMarker(input: string): ReplacementResult {
	const firstIndex = input.indexOf(cursorMarker);

	if (firstIndex === -1) {
		return {output: input, hasCursor: false};
	}

	// Replace first occurrence with save-cursor, strip the rest
	const output =
		input.slice(0, firstIndex) +
		saveCursor +
		input.slice(firstIndex + cursorMarker.length).replaceAll(cursorMarker, '');

	return {output, hasCursor: true};
}
