import React from 'react';
import {
	render,
	Box,
	Text,
	useInput,
	Cursor,
	type CursorPosition,
} from '../../src/index.js';

let handleCursorUpdated: (pos: CursorPosition | undefined) => void;

function App() {
	const [text, setText] = React.useState('');
	const [cursor, setCursor] = React.useState(0);
	const [cursorPos, setCursorPos] = React.useState<
		CursorPosition | undefined
	>();
	handleCursorUpdated = setCursorPos;

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

	const posString =
		cursorPos === undefined ? 'N/A' : `${cursorPos.x},${cursorPos.y}`;

	return (
		<Box flexDirection="column">
			<Text>Type Korean (Ctrl+C to exit):</Text>
			<Text>Text length: {text.length}</Text>
			<Text>Cursor Offset: {cursor}</Text>
			<Text>CursorPosition: {posString}</Text>
			<Box width={5}>
				<Text>
					{'> '}
					{before}
					<Cursor />
					{after}
				</Text>
			</Box>
		</Box>
	);
}

render(<App />, {
	onCursorUpdated(cursorPosition) {
		handleCursorUpdated(cursorPosition);
	},
});
