import React, {useState} from 'react';
import {render, Box, Text, useInput} from '../../src/index.js';

function TerminalResizeTest() {
	const [value, setValue] = useState('');

	useInput(input => {
		if (input === '\r') {
			// Enter key - clear input
			setValue('');
		} else if (input === '\u007F' || input === '\b') {
			// Backspace
			setValue(previous => previous.slice(0, -1));
		} else {
			// Regular character
			setValue(previous => previous + input);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				=== Terminal Resize Test ===
			</Text>
			<Text>
				Type something and then resize your terminal (drag the edge or press
				Cmd/Ctrl -/+)
			</Text>
			<Text>Input: "{value}"</Text>
			<Box marginTop={1}>
				<Text dimColor>Press Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
}

render(<TerminalResizeTest />, {
	patchConsole: true,
	exitOnCtrlC: true,
});
