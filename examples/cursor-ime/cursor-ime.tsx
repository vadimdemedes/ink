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

function App() {
	const [text, setText] = useState('');
	const {setCursorPosition} = useCursor();
	const {columns} = useWindowSize();

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(previous => {
				const lastGrapheme = segmenter
					.segment(previous)
					.containing(previous.length - 1);
				return previous.slice(0, lastGrapheme?.index ?? 0);
			});
			return;
		}

		if (!key.ctrl && !key.meta && !key.return && input) {
			setText(previous => previous + input);
		}
	});

	// Use stringWidth for correct cursor position with wide characters (Korean, CJK, emoji)
	const heading = 'Type Korean (Ctrl+C to exit):';
	const prompt = '> ';
	// Include a cursor cell so input ending at the terminal edge places it on the next row.
	const lines = wrapAnsi(`${heading}\n${prompt}${text} `, columns, {
		trim: false,
		hard: true,
	}).split('\n');
	setCursorPosition({x: stringWidth(lines.at(-1)) - 1, y: lines.length - 1});

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
