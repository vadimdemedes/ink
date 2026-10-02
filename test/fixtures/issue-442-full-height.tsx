import process from 'node:process';
import React, {useEffect} from 'react';
import {Box, Text, render, useApp} from '../../src/index.js';

const rowsArgument = Number(process.argv[2]);
const rows =
	rowsArgument === 0 || Number.isNaN(rowsArgument) ? 5 : rowsArgument;

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

	const terminalColumns = process.stdout.columns;
	const columns = terminalColumns > 0 ? terminalColumns : 100;

	return (
		<Box width={columns} height={rows} flexDirection="column">
			<Box flexGrow={1}>
				<Text>#442 top</Text>
			</Box>
			<Text>#442 bottom</Text>
		</Box>
	);
}

process.stdout.rows = rows;

render(<App />);
