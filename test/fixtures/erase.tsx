import React from 'react';
import {Box, Text, render} from '../../src';

const Erase = () => (
	<Box flexDirection="column">
		<Text>A</Text>
		<Text>B</Text>
		<Text>C</Text>
	</Box>
);

process.stdout.rows = Number(process.argv[2]);
render(<Erase />);
