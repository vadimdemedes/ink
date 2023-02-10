import process from 'node:process';
import React from 'react';
import {Static, Box, Text, render} from '../../src/index.js';

function EraseWithStatic() {
	return (
		<>
			<Static items={['A', 'B', 'C']}>
				{item => <Text key={item}>{item}</Text>}
			</Static>

			<Box flexDirection="column">
				<Text>D</Text>
				<Text>E</Text>
				<Text>F</Text>
			</Box>
		</>
	);
}

process.stdout.rows = Number(process.argv[3]);
render(<EraseWithStatic />);
