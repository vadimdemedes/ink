import React, {useState} from 'react';
import {render, Text, Box, useInput} from 'ink';

let messageId = 0;

function ChatApp() {
	const [input, setInput] = useState('');

	const [messages, setMessages] = useState<
		Array<{
			id: number;
			text: string;
		}>
	>([]);

	useInput((character, key) => {
		if (key.return) {
			if (input) {
				setMessages(previousMessages => [
					...previousMessages,
					{
						id: messageId++,
						text: `User: ${input}`,
					},
				]);
				setInput('');
			}
		} else if (key.backspace || key.delete) {
			setInput(currentInput => currentInput.slice(0, -1));
		} else {
			setInput(currentInput => currentInput + character);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box flexDirection="column">
				{messages.map(message => (
					<Text key={message.id}>{message.text}</Text>
				))}
			</Box>

			<Box marginTop={1}>
				<Text>Enter your message: {input}</Text>
			</Box>
		</Box>
	);
}

render(<ChatApp />);
