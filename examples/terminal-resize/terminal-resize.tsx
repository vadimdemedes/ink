import React from 'react';
import {render, Box, Text, useWindowSize} from '../../src/index.js';

function TerminalResizeExample() {
	const {columns, rows} = useWindowSize();

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
