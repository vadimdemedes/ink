import React, {useState} from 'react';
import stringWidth from 'string-width';
import wrapAnsi from 'wrap-ansi';
import {
	render,
	Box,
	Text,
	useInput,
	useCursor,
	useWindowSize,
} from '../../src/index.js';

const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});

// The start of the grapheme that ends at `index`.
const previousBoundary = (text: string, index: number): number =>
	segmenter.segment(text).containing(index - 1)?.index ?? 0;

// `index` if it is a grapheme boundary, otherwise the end of the grapheme it is inside.
const boundaryAtOrAfter = (text: string, index: number): number => {
	const grapheme = segmenter.segment(text).containing(index);
	return !grapheme || grapheme.index === index
		? index
		: grapheme.index + grapheme.segment.length;
};

// Wraps text the way Ink wraps `<Text>`.
const wrap = (text: string, columns: number): string =>
	wrapAnsi(text, columns, {trim: false, hard: true});

// Finds the row and column where the first character of `after` is rendered. For a single line without control characters, wrapping normalizes the text and otherwise only inserts newlines, so walking the normalized text alongside the wrapped text finds that character.
const wrappedPosition = (before: string, after: string, columns: number) => {
	const text = (before + after).normalize();
	const index = before.normalize().length;
	const wrapped = wrap(text, columns);
	let textIndex = 0;
	let wrappedIndex = 0;

	for (; wrappedIndex < wrapped.length; wrappedIndex++) {
		if (wrapped[wrappedIndex] !== text[textIndex]) {
			continue;
		}

		if (textIndex === index) {
			break;
		}

		textIndex++;
	}

	const rows = wrapped.slice(0, wrappedIndex).split('\n');
	return {x: stringWidth(rows.at(-1)!), y: rows.length - 1};
};

function App() {
	// `cursor` is a string index that always sits on a grapheme boundary.
	const [state, setState] = useState({text: '', cursor: 0});
	const {text, cursor} = state;
	const {setCursorPosition} = useCursor();
	const {columns} = useWindowSize();

	// Several keys can arrive before the next render, so every edit is computed from the previous state.
	useInput((input, key) => {
		if (key.leftArrow) {
			setState(previous => ({
				...previous,
				cursor: previousBoundary(previous.text, previous.cursor),
			}));
			return;
		}

		if (key.rightArrow) {
			setState(previous => ({
				...previous,
				cursor: boundaryAtOrAfter(
					previous.text,
					Math.min(previous.cursor + 1, previous.text.length),
				),
			}));
			return;
		}

		if (key.backspace) {
			setState(previous => {
				const start = previousBoundary(previous.text, previous.cursor);
				const nextText =
					previous.text.slice(0, start) + previous.text.slice(previous.cursor);
				return {
					text: nextText,
					// Removing a grapheme can join the ones around it, for example a letter between an emoji and a skin tone modifier.
					cursor: boundaryAtOrAfter(nextText, start),
				};
			});
			return;
		}

		// Pasted text can contain tabs and newlines. Wrapping rewrites them, which would break the cursor lookup, so this single-line input drops them. That also drops Enter.
		const printable = input.replaceAll(/\p{Control}/gu, '');

		if (printable !== '' && !key.ctrl && !key.meta) {
			setState(previous => {
				const nextText =
					previous.text.slice(0, previous.cursor) +
					printable +
					previous.text.slice(previous.cursor);
				return {
					text: nextText,
					// The input can join the grapheme after it, for example a regional indicator typed before another one.
					cursor: boundaryAtOrAfter(
						nextText,
						previous.cursor + printable.length,
					),
				};
			});
		}
	});

	const heading =
		'Type Korean, left/right arrows move the cursor (Ctrl+C to exit):';
	const prompt = '> ';
	const headingRows = wrap(heading, columns).split('\n').length;
	// Include a cursor cell so a cursor at the end of input that fills the row is placed on the next row.
	const position = wrappedPosition(
		`${prompt}${text.slice(0, cursor)}`,
		`${text.slice(cursor)} `,
		columns,
	);
	setCursorPosition({x: position.x, y: headingRows + position.y});

	return (
		<Box flexDirection="column">
			<Text>{heading}</Text>
			<Text>
				{prompt}
				{text}
			</Text>
		</Box>
	);
}

render(<App />);
