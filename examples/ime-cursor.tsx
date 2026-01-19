/**
 * IME Cursor Demo
 *
 * Demonstrates the enableImeCursor feature for proper CJK input support.
 * Run with: npm run example examples/ime-cursor.tsx
 */
import React, {useState} from 'react';
import {render, Box, Text, useInput, CURSOR_MARKER} from '../src/index.js';

function TextInput({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	const [cursorPosition, setCursorPosition] = useState(value.length);

	useInput((input, key) => {
		if (key.leftArrow) {
			setCursorPosition(Math.max(0, cursorPosition - 1));
			return;
		}

		if (key.rightArrow) {
			setCursorPosition(Math.min(value.length, cursorPosition + 1));
			return;
		}

		if (key.backspace || key.delete) {
			if (cursorPosition > 0) {
				const newValue =
					value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
				onChange(newValue);
				setCursorPosition(cursorPosition - 1);
			}
			return;
		}

		if (key.return) {
			return;
		}

		if (input) {
			const newValue =
				value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
			onChange(newValue);
			setCursorPosition(cursorPosition + input.length);
		}
	});

	const before = value.slice(0, cursorPosition);
	const cursorChar = value[cursorPosition] || ' ';
	const after = value.slice(cursorPosition + 1);

	const showPlaceholder = value.length === 0 && placeholder;

	return (
		<Box>
			<Text>
				{showPlaceholder ? (
					<Text dimColor>{placeholder}</Text>
				) : (
					<>
						{before}
						{CURSOR_MARKER}
						<Text inverse>{cursorChar}</Text>
						{after}
					</>
				)}
			</Text>
		</Box>
	);
}

function App() {
	const [value, setValue] = useState('');

	useInput((_input, key) => {
		if (key.escape) {
			process.exit(0);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold>IME Cursor Demo</Text>
			</Box>
			<Box marginBottom={1}>
				<Text dimColor>
					Type in Japanese/Chinese/Korean - IME window should follow cursor
				</Text>
			</Box>
			<Box>
				<Text>Input: </Text>
				<TextInput
					value={value}
					onChange={setValue}
					placeholder="Type here... (日本語入力OK)"
				/>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Press ESC to exit</Text>
			</Box>
		</Box>
	);
}

render(<App />, {
	enableImeCursor: true,
});
