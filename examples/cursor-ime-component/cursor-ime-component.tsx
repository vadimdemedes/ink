import React from 'react';
import {render, Box, Text, useInput, Cursor} from '../../src/index.js';

function App() {
	const [text, setText] = React.useState('');
	const [cursor, setCursor] = React.useState(0);

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(previous => previous.slice(0, -1));
			setCursor(previous => previous - 1);
			return;
		}

		if (key.leftArrow) {
			setCursor(previous => Math.max(0, previous - 1));
		}

		if (key.rightArrow) {
			setCursor(previous => Math.min(previous + 1, text.length));
		}

		if (!key.ctrl && !key.meta && input) {
			setText(previous => {
				const before = previous.slice(0, cursor);
				const after = previous.slice(cursor);
				return before + input + after;
			});
			setCursor(previous => previous + 1);
		}
	});

	const before = text.slice(0, cursor);
	const after = text.slice(cursor);

	return (
		<Box flexDirection="column" width={5}>
			<Text>Type Korean (Ctrl+C to exit):</Text>
			<Text>
				{'> '}
				{before}
				<Cursor />
				{after}
			</Text>
		</Box>
	);
}

render(<App />);
