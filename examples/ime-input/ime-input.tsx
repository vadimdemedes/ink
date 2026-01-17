import React, {useState, useLayoutEffect} from 'react';
import stringWidth from 'string-width';
import {
	render,
	useInput,
	useApp,
	useCursor,
	Box,
	Text,
} from '../../src/index.js';

function ImeInputDemo() {
	const {exit} = useApp();
	const {setCursorPosition} = useCursor();
	const [inputText, setInputText] = useState('');
	const [messages, setMessages] = useState<string[]>([]);

	// Set cursor position for IME candidate window
	// Using useLayoutEffect to set position synchronously after render
	useLayoutEffect(() => {
		// Calculate cursor position:
		//
		// After output, cursor is on a new line below the last line of content.
		// cursorUp(y) moves y lines up from that position.
		// y=1 means last line of content, y=2 means second-to-last, etc.
		//
		// Layout structure (from bottom of visible content):
		// y=1: ╰──...──╯ (bottom border of input box)
		// y=2: │ > {inputText}| │ (input line - THIS IS WHERE CURSOR SHOULD BE)
		// y=3: ╭──...──╮ (top border of input box)
		//
		// X position:
		// - Outer Box paddingX: 1 space
		// - Input Box border: 1 char (│)
		// - Input Box paddingX: 1 space
		// - Text "> ": 2 chars
		// Total prefix: 1 + 1 + 1 + 2 = 5
		const prefixWidth = 5;
		const textWidth = stringWidth(inputText);
		const cursorX = prefixWidth + textWidth;

		// Y position: input text is on line 2 from the bottom
		const cursorY = 2;

		setCursorPosition({
			x: cursorX,
			y: cursorY,
			visible: true, // Show cursor for IME support (especially needed for Zellij)
		});

		return () => {
			// Clear cursor position on unmount
			setCursorPosition(undefined);
		};
	}, [inputText, setCursorPosition]);

	useInput((input, key) => {
		// Ctrl+C or Escape to exit
		if (key.escape || (key.ctrl && input === 'c')) {
			exit();
			return;
		}

		// Enter to submit message
		if (key.return) {
			if (inputText.trim()) {
				setMessages(previous => [...previous.slice(-9), inputText]);
				setInputText('');
			}

			return;
		}

		// Backspace to delete
		if (key.backspace || key.delete) {
			setInputText(previous => previous.slice(0, -1));
			return;
		}

		// Ignore control keys
		if (
			key.ctrl ||
			key.meta ||
			key.upArrow ||
			key.downArrow ||
			key.leftArrow ||
			key.rightArrow ||
			key.tab
		) {
			return;
		}

		// Add input character (supports Japanese/Chinese/Korean IME input)
		if (input) {
			setInputText(previous => previous + input);
		}
	});

	return (
		<Box flexDirection="column" paddingX={1}>
			<Box borderStyle="round" borderColor="cyan" paddingX={1}>
				<Text bold color="cyan">
					IME Input Test
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Press Enter to send, Escape to exit.</Text>
			</Box>

			{/* Message history */}
			<Box
				flexDirection="column"
				marginTop={1}
				borderStyle="single"
				borderColor="gray"
				height={8}
				paddingX={1}
			>
				<Text dimColor>Messages:</Text>
				{messages.length === 0 ? (
					<Text color="gray">(empty)</Text>
				) : (
					messages.map((message, i) => (
						// eslint-disable-next-line react/no-array-index-key
						<Box key={i}>
							<Text color="green">{message}</Text>
						</Box>
					))
				)}
			</Box>

			{/* Input area - cursor is shown via terminal cursor (visible: true) */}
			<Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1}>
				<Text color="yellow">{'> '}</Text>
				<Text>{inputText}</Text>
			</Box>
		</Box>
	);
}

render(<ImeInputDemo />);
