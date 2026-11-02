import React from 'react';
import {
	render,
	Box,
	Text,
	useInput,
	Cursor,
	type CursorPosition,
} from '../../src/index.js';
import {
	countNonAnsiGraphemes,
	graphemeOffsetToByteOffset,
} from '../../src/string-utils.js';

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
			setText(previous => {
				if (cursor === 0) {
					return previous;
				}
				const startOfPrevious = graphemeOffsetToByteOffset(
					previous,
					cursor - 1,
				);
				const startOfCursor = graphemeOffsetToByteOffset(previous, cursor);
				return (
					previous.slice(0, startOfPrevious) + previous.slice(startOfCursor)
				);
			});
			setCursor(previous => Math.max(0, previous - 1));
			return;
		}

		if (key.leftArrow) {
			setCursor(previous => Math.max(0, previous - 1));
		}

		if (key.rightArrow) {
			const end = countNonAnsiGraphemes(text);
			setCursor(previous => Math.min(previous + 1, end));
		}

		if (input === '' || key.ctrl || key.meta || key.return) {
			return;
		}

		setText(previous => {
			const cursorIndex = graphemeOffsetToByteOffset(previous, cursor);
			const before = previous.slice(0, cursorIndex);
			const after = previous.slice(cursorIndex);
			return before + input + after;
		});
		setCursor(previous => previous + countNonAnsiGraphemes(input));
	});

	const cursorIndex = graphemeOffsetToByteOffset(text, cursor) ?? text.length;
	const before = text.slice(0, cursorIndex);
	const after = text.slice(cursorIndex);

	const posString =
		cursorPos === undefined ? 'N/A' : `${cursorPos.x},${cursorPos.y}`;

	return (
		<Box flexDirection="column">
			<Text>Type Korean (Ctrl+C to exit):</Text>
			<Text>Text length: {text.length}</Text>
			<Text>Cursor Offset: {cursor}</Text>
			<Text>Cursor Index: {cursorIndex}</Text>
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
