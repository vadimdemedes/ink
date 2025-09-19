import process from 'node:process';
import React, {useEffect} from 'react';
import {Box, Text, render, useApp} from '../../src/index.js';

function Fullscreen() {
	const {exit} = useApp();

	useEffect(() => {
		// Exit after first render to check the output
		const timer = setTimeout(() => {
			exit();
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [exit]);

	// Force the root to occupy exactly terminal rows
	const rows = Number(process.argv[2]) || 5;

	return (
		<Box height={rows} flexDirection="column">
			<Box flexGrow={1}>
				<Text>Full-screen: top</Text>
			</Box>
			<Text>Bottom line (should be usable)</Text>
		</Box>
	);
}

// Set terminal size from argument
process.stdout.rows = Number(process.argv[2]) || 5;

render(<Fullscreen />);
