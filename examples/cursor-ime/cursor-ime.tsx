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

function splitAt(str: string, index: number): [string, string] {
	const chars = [...str];
	return [chars.slice(0, index).join(''), chars.slice(index).join('')];
}

function charCount(str: string): number {
	return [...str].length;
}

const PROMPT = '> ';

function TextInput() {
	const [text, setText] = useState('');
	const [cursorIndex, setCursorIndex] = useState(0);
	const [submitted, setSubmitted] = useState<string[]>([]);
	const {setCursorPosition} = useCursor();

	useInput((input, key) => {
		if (key.return) {
			if (text.length > 0) {
				setSubmitted(prev => [...prev, text]);
				setText('');
				setCursorIndex(0);
			}
			return;
		}

		if (key.backspace || key.delete) {
			if (cursorIndex > 0) {
				const [before, after] = splitAt(text, cursorIndex);
				setText(before.slice(0, -1) + after);
				setCursorIndex(prev => prev - 1);
			}
			return;
		}

		if (key.leftArrow) {
			setCursorIndex(prev => Math.max(0, prev - 1));
			return;
		}
		if (key.rightArrow) {
			setCursorIndex(prev => Math.min(charCount(text), prev + 1));
			return;
		}

		if (!key.ctrl && !key.meta && input) {
			const [before, after] = splitAt(text, cursorIndex);
			setText(before + input + after);
			setCursorIndex(prev => prev + charCount(input));
		}
	});

	// stringWidth: "한글" = 4 columns, "abc" = 3 columns
	const beforeCursor = splitAt(text, cursorIndex)[0];
	const cursorColumn = stringWidth(PROMPT + beforeCursor);
	setCursorPosition({x: cursorColumn, y: 1 + submitted.length});

	return (
		<Box flexDirection="column">
			<Text>
				Korean TextInput Demo — type in Korean or English (Ctrl+C to exit)
			</Text>
			{submitted.map((line, i) => (
				<Text key={i} color="gray">
					{PROMPT}
					{line}
				</Text>
			))}
			<Text>
				{PROMPT}
				{text}
			</Text>
		</Box>
	);
}

render(<TextInput />);
