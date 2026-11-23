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

// Finds the row and column where the character at `offset` in `text` is rendered. For a single line without control characters, wrapping normalizes the text and otherwise only inserts newlines, so the rows hold the normalized text in order.
const wrappedPosition = (text: string, offset: number, columns: number) => {
	const rows = wrap(text, columns).split('\n');
	let y = 0;
	let rowOffset = offset;

	while (y < rows.length - 1 && rowOffset >= rows[y]!.length) {
		rowOffset -= rows[y]!.length;
		y++;
	}

	return {x: stringWidth(rows[y]!.slice(0, rowOffset)), y};
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
	// The trailing space is a cell for the cursor, so a cursor at the end of input that fills the row gets a row of its own. It is rendered as well, so the frame is as tall as the rows the cursor is placed in.
	const line = `${prompt}${text} `;
	const position = wrappedPosition(
		line,
		`${prompt}${text.slice(0, cursor)}`.normalize().length,
		columns,
	);
	setCursorPosition({x: position.x, y: headingRows + position.y});

	return (
		<Box flexDirection="column">
			<Text>{heading}</Text>
			<Text>{line}</Text>
		</Box>
	);
}

render(<App />);
