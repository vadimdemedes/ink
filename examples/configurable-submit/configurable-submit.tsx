import process from 'node:process';
import React, {useState} from 'react';
import {
	render,
	Text,
	Box,
	useInput,
	useStdin,
	useApp,
} from '../../src/index.js';

let messageId = 0;

function ConfigurableSubmitDemo() {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const {internal_submitKeyBehavior} = useStdin();
	const {exit} = useApp();
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<
		Array<{
			id: number;
			text: string;
		}>
	>([]);

	useInput((character, key) => {
		if (character === 'c' && key.ctrl) {
			exit();
			return;
		}

		const shouldSubmit =
			internal_submitKeyBehavior === 'enter'
				? key.return && !key.ctrl
				: key.return && key.ctrl;

		if (shouldSubmit) {
			if (input.trim()) {
				setMessages(previousMessages => [
					...previousMessages,
					{
						id: messageId++,
						text: `User: ${input}`,
					},
				]);
				setInput('');
			}
		} else if (
			key.return &&
			!key.ctrl &&
			internal_submitKeyBehavior === 'ctrl-enter'
		) {
			setInput(currentInput => currentInput + '\n');
		} else if (key.backspace || key.delete) {
			setInput(currentInput => currentInput.slice(0, -1));
		} else if (character === 'q' && input === '') {
			exit();
		} else if (character && character !== '\r' && character !== '\n') {
			setInput(currentInput => currentInput + character);
		}
	});

	const inputLines = input.split('\n');

	return (
		<Box flexDirection="column" padding={1}>
			<Box flexDirection="column" marginBottom={1}>
				<Text bold>
					Submit Mode:{' '}
					{internal_submitKeyBehavior === 'enter' ? '[Enter]' : '[Ctrl+Enter]'}
				</Text>
				<Text dimColor>
					{internal_submitKeyBehavior === 'enter'
						? 'Press Enter to submit'
						: 'Press Ctrl+Enter to submit, Enter for newline'}
				</Text>
			</Box>

			<Box flexDirection="column">
				{messages.map(message => (
					<Text key={message.id}>{message.text}</Text>
				))}
			</Box>

			<Box
				marginTop={1}
				flexDirection="column"
				borderStyle="single"
				borderColor="yellow"
				paddingX={1}
			>
				<Text bold color="yellow">
					Input:
				</Text>
				{inputLines.map((line, lineIndex) => (
					<Text key={`line-${lineIndex}`}>{line || ' '}</Text> // eslint-disable-line react/no-array-index-key
				))}
			</Box>
		</Box>
	);
}

const submitBehavior =
	process.env['SUBMIT_MODE'] === 'ctrl-enter' ? 'ctrl-enter' : 'enter';

render(<ConfigurableSubmitDemo />, {
	submitKeyBehavior: submitBehavior,
	exitOnCtrlC: false,
	kittyKeyboard: {
		mode: 'enabled',
		flags: ['disambiguateEscapeCodes'],
	},
});
