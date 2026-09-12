import React from 'react';
import {render, Box, Text, useWindowSize, useInput} from '../../src/index.js';

function TerminalResizeExample() {
	const {columns, rows} = useWindowSize();
	useInput(() => {
		// Keep the demo running until Ctrl+C while waiting for resize events.
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Terminal Size
			</Text>
			<Text>Columns: {columns}</Text>
			<Text>Rows: {rows}</Text>
			<Box marginTop={1}>
				<Text dimColor>
					Resize your terminal to see the values update. Press Ctrl+C to exit.
				</Text>
			</Box>
		</Box>
	);
}

render(<TerminalResizeExample />, {
	patchConsole: true,
	exitOnCtrlC: true,
});
