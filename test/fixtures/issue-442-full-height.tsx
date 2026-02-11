import process from 'node:process';
import React, {useEffect} from 'react';
import {Box, Text, render, useApp} from '../../src/index.js';

function App() {
	const {exit} = useApp();

	useEffect(() => {
		const timer = setTimeout(() => {
			exit();
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [exit]);

	const rows = Number(process.argv[2]) || 5;
	const columns = process.stdout.columns || 100;

	return (
		<Box width={columns} height={rows} flexDirection="column">
			<Box flexGrow={1}>
				<Text>#442 top</Text>
			</Box>
			<Text>#442 bottom</Text>
		</Box>
	);
}

process.stdout.rows = Number(process.argv[2]) || 5;

render(<App />);
