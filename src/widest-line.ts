import stringWidth from 'string-width';

/**
 * Get the visual width of the widest line in a string.
 *
 * This is a local implementation to avoid version mismatches between
 * the `widest-line` package (which uses string-width@7.x) and the
 * `string-width` version used elsewhere in ink (v8.x). Such mismatches
 * can cause emoji width calculation inconsistencies, leading to box
 * border alignment issues (see issue #733).
 */
const widestLine = (text: string): number => {
	let lineWidth = 0;

	for (const line of text.split('\n')) {
		lineWidth = Math.max(lineWidth, stringWidth(line));
	}

	return lineWidth;
};

export default widestLine;
