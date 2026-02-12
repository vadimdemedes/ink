/**
 * IME-Compatible TextInput Example for Ink
 *
 * Demonstrates how to build a text input that works correctly with IME
 * (Input Method Editor) for Korean, Japanese, and Chinese.
 *
 * Key concepts:
 *  1. useCursor() — Positions the REAL terminal cursor. IME composition
 *     windows anchor to the real cursor, so fake cursors (chalk.inverse)
 *     break CJK input completely.
 *  2. stringWidth() — CJK characters occupy 2 terminal columns but are
 *     1 character in JavaScript. Use stringWidth for correct column offset.
 *  3. Middle insertion — Arrow keys move the cursor; text inserts at cursor.
 *
 * Try it:
 *   npx tsx examples/cursor-ime/cursor-ime.tsx
 *
 * Switch your OS keyboard to Korean (한국어) and type. You should see
 * Hangul composition (ㅎ → 하 → 한) happening naturally at the cursor.
 */

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
