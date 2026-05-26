import React, {useState} from 'react';
import stringWidth from 'string-width';
import {
	render,
	Box,
	Text,
	useApp,
	useInput,
	useCursor,
} from '../../src/index.js';

type Mode = 'normal' | 'insert';

function InputArea() {
	const {exit} = useApp();
	const [mode, setMode] = useState<Mode>('normal');
	const [text, setText] = useState('');
	const {setCursorPosition, setCursorShape} = useCursor();

	useInput((input, key) => {
		if (mode === 'normal') {
			if (input === 'q') {
				exit();
				return;
			}

			if (input === 'i') {
				setMode('insert');
			}

			return;
		}

		if (key.escape) {
			setMode('normal');
			return;
		}

		if (key.backspace || key.delete) {
			setText(previous => previous.slice(0, -1));
			return;
		}

		if (!key.ctrl && !key.meta && input) {
			setText(previous => previous + input);
		}
	});

	const prompt = '> ';
	const cursorIndex =
		mode === 'insert' ? text.length : Math.max(0, text.length - 1);
	const cursorX = stringWidth(prompt + text.slice(0, cursorIndex));

	setCursorShape(mode === 'insert' ? 'bar' : 'block');
	setCursorPosition({x: cursorX, y: 2});

	return (
		<Box flexDirection="column">
			<Text>
				Two-mode input <Text dimColor>(press q in normal mode to quit)</Text>
			</Text>
			<Text>
				mode:{' '}
				<Text bold color={mode === 'insert' ? 'green' : 'cyan'}>
					-- {mode.toUpperCase()} --
				</Text>
			</Text>
			<Text>
				{prompt}
				{text}
			</Text>
			<Box marginTop={1}>
				<Text dimColor>
					{mode === 'normal' ? 'i: insert · q: quit' : 'Esc: normal'}
				</Text>
			</Box>
		</Box>
	);
}

render(<InputArea />);
