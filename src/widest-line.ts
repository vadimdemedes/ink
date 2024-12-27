import stringWidth from 'string-width';

export function widestLine(string: string): number {
	let lineWidth = 0;

	for (const line of string.split('\n')) {
		lineWidth = Math.max(lineWidth, stringWidth(line));
	}

	return lineWidth;
}
