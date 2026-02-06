import React, {useState} from 'react';
import stringWidth from 'string-width';
import {render, Box, Text, useInput, useCursor} from '../../src/index.js';

function App() {
	const [text, setText] = useState('');
	const {setCursorPosition} = useCursor();

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(previous => previous.slice(0, -1));
			return;
		}

		if (!key.ctrl && !key.meta && input) {
			setText(previous => previous + input);
		}
	});

	// Use stringWidth for correct cursor position with wide characters (Korean, CJK, emoji)
	const prompt = '> ';
	setCursorPosition({x: stringWidth(prompt + text), y: 1});

	return (
		<Box flexDirection="column">
			<Text>Type Korean (Ctrl+C to exit):</Text>
			<Text>
				{prompt}
				{text}
			</Text>
		</Box>
	);
}

render(<App />);
