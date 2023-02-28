import process from 'node:process';
import React from 'react';
import {Box, Text, render} from '../../src/index.js';

function Erase() {
	return (
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>
	);
}

process.stdout.rows = Number(process.argv[2]);
render(<Erase />);
