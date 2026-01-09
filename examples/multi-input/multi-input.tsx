import React, {useState, useRef, useEffect, useReducer} from 'react';
import stringWidth from 'string-width';
import {render, Text, Box, useInput} from '../../src/index.js';

let messageId = 0;

function ChatApp() {
	const [input, setInput] = useState('');
	const [name, setName] = useState('');
	const [activeField, setActiveField] = useState<'input' | 'name'>('input');
	const [inputCursor, setInputCursor] = useState(0);
	const [nameCursor, setNameCursor] = useState(0);
	const [, forceUpdate] = useReducer(x => x + 1, 0);

	const [messages, setMessages] = useState<
		Array<{
			id: number;
			text: string;
		}>
	>([]);

	// Use refs to always have the latest values
	const inputReference = useRef('');
	const nameReference = useRef('');
	const inputCursorReference = useRef(0);
	const nameCursorReference = useRef(0);

	useEffect(() => {
		inputReference.current = input;
		nameReference.current = name;
		inputCursorReference.current = inputCursor;
		nameCursorReference.current = nameCursor;
	}, [input, name, inputCursor, nameCursor]);

	// Helper function to get line info from cursor position
	const getLineInfo = (text: string, cursor: number) => {
		const textBeforeCursor = text.slice(0, cursor);
		const lines = text.split('\n');
		const linesBeforeCursor = textBeforeCursor.split('\n');
		const currentLineIndex = linesBeforeCursor.length - 1;
		const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
		const colInLine = cursor - currentLineStart;
		return {lines, currentLineIndex, colInLine, currentLineStart};
	};

	useInput((character, key) => {
		// Switch focus with Tab key only
		if (key.tab) {
			setActiveField(current => (current === 'input' ? 'name' : 'input'));
			return;
		}

		const isInputField = activeField === 'input';
		const currentText = isInputField
			? inputReference.current
			: nameReference.current;
		const currentCursor = isInputField
			? inputCursorReference.current
			: nameCursorReference.current;
		const setText = isInputField ? setInput : setName;
		const setCursor = isInputField ? setInputCursor : setNameCursor;
		const textReference = isInputField ? inputReference : nameReference;
		const cursorReference = isInputField
			? inputCursorReference
			: nameCursorReference;

		// Up arrow or Ctrl+P - Move cursor up (do nothing if at first line)
		if (key.upArrow || (key.ctrl && character === 'p')) {
			const {lines, currentLineIndex, colInLine} = getLineInfo(
				currentText,
				currentCursor,
			);
			if (currentLineIndex > 0) {
				// Move to previous line
				const previousLine = lines[currentLineIndex - 1]!;
				const newCol = Math.min(colInLine, previousLine.length);
				// Calculate new cursor position
				let newPos = 0;
				for (let i = 0; i < currentLineIndex - 1; i++) {
					newPos += lines[i]!.length + 1; // +1 for newline
				}

				newPos += newCol;
				setCursor(newPos);
				cursorReference.current = newPos;
				forceUpdate();
			}

			// At first line, do nothing (keep cursor position)
			return;
		}

		// Down arrow or Ctrl+N - Move cursor down (do nothing if at last line)
		if (key.downArrow || (key.ctrl && character === 'n')) {
			const {lines, currentLineIndex, colInLine} = getLineInfo(
				currentText,
				currentCursor,
			);
			if (currentLineIndex < lines.length - 1) {
				// Move to next line
				const nextLine = lines[currentLineIndex + 1]!;
				const newCol = Math.min(colInLine, nextLine.length);
				// Calculate new cursor position
				let newPos = 0;
				for (let i = 0; i <= currentLineIndex; i++) {
					newPos += lines[i]!.length + 1; // +1 for newline
				}

				newPos += newCol;
				setCursor(newPos);
				cursorReference.current = newPos;
				forceUpdate();
			}

			// At last line, do nothing (keep cursor position)
			return;
		}

		// Left arrow or Ctrl+B - Move cursor left
		if (key.leftArrow || (key.ctrl && character === 'b')) {
			const newPos = Math.max(0, currentCursor - 1);
			setCursor(newPos);
			cursorReference.current = newPos;
			forceUpdate();
			return;
		}

		// Right arrow or Ctrl+F - Move cursor right
		if (key.rightArrow || (key.ctrl && character === 'f')) {
			const newPos = Math.min(currentText.length, currentCursor + 1);
			setCursor(newPos);
			cursorReference.current = newPos;
			forceUpdate();
			return;
		}

		// Home or Ctrl+A - Move cursor to beginning
		if (key.home || (key.ctrl && character === 'a')) {
			setCursor(0);
			cursorReference.current = 0;
			forceUpdate();
			return;
		}

		// End or Ctrl+E - Move cursor to end
		if (key.end || (key.ctrl && character === 'e')) {
			const newPos = currentText.length;
			setCursor(newPos);
			cursorReference.current = newPos;
			forceUpdate();
			return;
		}

		// Enter - Submit input
		if (key.return) {
			// IME FIX: If there's input text with return key, add it to current text before submitting
			let finalText = currentText;
			if (character && !/[\r\n]/.test(character)) {
				finalText += character;
			}

			const trimmedText = finalText.trim();
			if (trimmedText !== '') {
				const label = isInputField ? 'User' : 'Name';
				setMessages(previousMessages => [
					...previousMessages,
					{
						id: messageId++,
						text: `${label}: ${trimmedText}`,
					},
				]);
			}

			setText('');
			textReference.current = '';
			setCursor(0);
			cursorReference.current = 0;
			return;
		}

		// Backspace - Delete character before cursor
		if (key.backspace) {
			if (currentCursor > 0) {
				setText(previous => {
					const newText =
						previous.slice(0, currentCursor - 1) +
						previous.slice(currentCursor);
					textReference.current = newText;
					return newText;
				});
				const newPos = currentCursor - 1;
				setCursor(newPos);
				cursorReference.current = newPos;
			}

			return;
		}

		// Delete - In most terminals, backspace is detected as delete
		// So we treat delete as backspace (delete character before cursor)
		if (key.delete) {
			if (currentCursor > 0) {
				setText(previous => {
					const newText =
						previous.slice(0, currentCursor - 1) +
						previous.slice(currentCursor);
					textReference.current = newText;
					return newText;
				});
				const newPos = currentCursor - 1;
				setCursor(newPos);
				cursorReference.current = newPos;
			}

			return;
		}

		// General input - Insert at cursor position
		if (!key.ctrl && !key.meta && character) {
			setText(previous => {
				const newText =
					previous.slice(0, currentCursor) +
					character +
					previous.slice(currentCursor);
				textReference.current = newText;
				return newText;
			});
			const newPos = currentCursor + character.length;
			setCursor(newPos);
			cursorReference.current = newPos;
		}
	});

	const namePrefixString = 'Enter your name: ';
	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				=== Multi-Input Arrow Key Test ===
			</Text>
			<Text dimColor>
				Arrow keys (↑↓←→) or Ctrl+P/N/B/F to move. Tab/Up/Down to switch fields.
				Home/End or Ctrl+A/E to jump.
			</Text>

			<Box flexDirection="column" marginTop={1}>
				{messages.map(message => (
					<Text key={message.id}>{message.text}</Text>
				))}
			</Box>

			<Box marginTop={1}>
				<Text>Enter your message: </Text>
				<Text
					terminalCursorFocus={activeField === 'input'}
					terminalCursorPosition={inputCursor}
					color={activeField === 'input' ? 'green' : 'white'}
				>
					{input}
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text
					terminalCursorFocus={activeField === 'name'}
					terminalCursorPosition={stringWidth(namePrefixString) + nameCursor}
					color={activeField === 'name' ? 'green' : 'white'}
				>
					{namePrefixString}
					{name}
				</Text>
			</Box>
		</Box>
	);
}

render(<ChatApp />, {
	enableImeCursor: true,
});
