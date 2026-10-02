import ansiEscapes from 'ansi-escapes';
import stringWidth from 'string-width';

const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
// eslint-disable-next-line no-control-regex, regexp/no-control-character -- SGR starts with ESC.
const sgr = /\u{1B}\[[\d;]*m/gu;
// Only SGR is safe to replay without moving the cursor or changing terminal modes.
// OSC links, tabs, and other controls retain the existing whole-line path.
const control = /\p{Control}/u;
// eslint-disable-next-line regexp/no-obscure-range -- The range covers every printable ASCII character.
const printableAscii = /^[ -~]*$/u;

// Build a changed line, leaving its identical styled prefix on screen when safe.
export default function lineUpdate(
	previous: string,
	next: string,
	columns: number | undefined,
): string {
	const full = ansiEscapes.cursorTo(0) + next;
	if (columns === undefined || Number.isNaN(columns) || columns < 1) {
		return full;
	}

	let commonLength = 0;
	while (
		commonLength < previous.length &&
		commonLength < next.length &&
		previous[commonLength] === next[commonLength]
	) {
		commonLength++;
	}

	if (commonLength === 0) {
		return full;
	}

	const previousText = previous.replaceAll(sgr, '');
	const nextText = next.replaceAll(sgr, '');
	if (control.test(previousText) || control.test(nextText)) {
		return full;
	}

	// eslint-disable-next-line unicorn/prefer-iterator-to-array -- Iterator helpers are not in the project's ES2024 library.
	const codes = [...next.matchAll(sgr)];
	let textLimit = commonLength;
	for (const match of codes) {
		if (match.index >= commonLength) {
			break;
		}

		// A difference inside an SGR sequence must repaint from before that sequence.
		textLimit -= Math.min(match[0].length, commonLength - match.index);
	}

	let textLength = 0;
	let column = 0;
	// ASCII is common in counters and tables; avoid per-cell segmentation there.
	if (printableAscii.test(previousText) && printableAscii.test(nextText)) {
		textLength = textLimit;
		column = textLimit;
	} else {
		const previousSegments = segmenter.segment(previousText)[Symbol.iterator]();
		for (const {segment, index} of segmenter.segment(nextText)) {
			if (
				index + segment.length > textLimit ||
				previousSegments.next().value?.segment !== segment
			) {
				break;
			}

			textLength = index + segment.length;
		}

		column = stringWidth(nextText.slice(0, textLength));
	}

	// CHA clamps at the last cell. It cannot reproduce a wrap-pending cursor
	// after a full-width prefix, particularly when the suffix only closes styles.
	if (
		column === 0 ||
		column >= columns ||
		column + stringWidth(previousText.slice(textLength)) > columns ||
		column + stringWidth(nextText.slice(textLength)) > columns
	) {
		return full;
	}

	let offset = textLength;
	let styles = '';
	for (const match of codes) {
		if (match.index > offset || match.index + match[0].length > commonLength) {
			break;
		}

		offset += match[0].length;
		// Replay the exact SGR history so nested resets and extended colors have
		// the same state as a full write, including the state used by eraseEndLine.
		styles += match[0];
	}

	const partial = ansiEscapes.cursorTo(column) + styles + next.slice(offset);
	return partial.length < full.length ? partial : full;
}
