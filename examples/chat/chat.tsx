import React, {useState} from 'react';
import {render, Text, Box, useInput} from '../../src/index.js';

const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});

function ChatApp() {
	const [{input, messages}, setChat] = useState<{
		input: string;
		messages: Array<{
			id: number;
			text: string;
		}>;
	}>({input: '', messages: []});

	useInput((character, key) => {
		setChat(previousChat => {
			if (key.return) {
				if (previousChat.input) {
					return {
						input: '',
						messages: [
							...previousChat.messages,
							{
								id: previousChat.messages.length,
								text: `User: ${previousChat.input}`,
							},
						],
					};
				}
			} else if (key.backspace || key.delete) {
				const lastGrapheme = segmenter
					.segment(previousChat.input)
					.containing(previousChat.input.length - 1);
				return {
					...previousChat,
					input: previousChat.input.slice(0, lastGrapheme?.index ?? 0),
				};
			} else if (!key.ctrl && !key.meta) {
				return {...previousChat, input: previousChat.input + character};
			}

			return previousChat;
		});
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
