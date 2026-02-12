// IME-compatible text input using useCursor + stringWidth for correct
// CJK cursor positioning.

import React, {useState} from 'react';
import stringWidth from 'string-width';
import {render, Box, Text, useInput, useCursor} from '../../src/index.js';

function splitAt(string_: string, index: number): [string, string] {
	const chars = [...string_];
	return [chars.slice(0, index).join(''), chars.slice(index).join('')];
}

function charCount(string_: string): number {
	return [...string_].length;
}

const prompt = '> ';

function TextInput() {
	const [text, setText] = useState('');
	const [cursorIndex, setCursorIndex] = useState(0);
	const [submitted, setSubmitted] = useState<string[]>([]);
	const {setCursorPosition} = useCursor();

	useInput((input, key) => {
		if (key.return) {
			if (text.length > 0) {
				setSubmitted(previous => [...previous, text]);
				setText('');
				setCursorIndex(0);
			}

			return;
		}

		if (key.backspace || key.delete) {
			if (cursorIndex > 0) {
				const [before, after] = splitAt(text, cursorIndex);
				setText(before.slice(0, -1) + after);
				setCursorIndex(previous => previous - 1);
			}

			return;
		}

		if (key.leftArrow) {
			setCursorIndex(previous => Math.max(0, previous - 1));

			return;
		}

		if (key.rightArrow) {
			setCursorIndex(previous => Math.min(charCount(text), previous + 1));

			return;
		}

		if (key.upArrow || key.downArrow) {
			return;
		}

		if (!key.ctrl && !key.meta && input) {
			const [before, after] = splitAt(text, cursorIndex);
			setText(before + input + after);
			setCursorIndex(previous => previous + charCount(input));
		}
	});

	// StringWidth: "한글" = 4 columns, "abc" = 3 columns
	const beforeCursor = splitAt(text, cursorIndex)[0];
	const cursorColumn = stringWidth(prompt + beforeCursor);
	setCursorPosition({x: cursorColumn, y: 1 + submitted.length});

	return (
		<Box flexDirection="column">
			<Text>
				Korean TextInput Demo — type in Korean or English (Ctrl+C to exit)
			</Text>
			{submitted.map((line, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<Text key={index} color="gray">
					{prompt}
					{line}
				</Text>
			))}
			<Text>
				{prompt}
				{text}
			</Text>
		</Box>
	);
}

render(<TextInput />);
