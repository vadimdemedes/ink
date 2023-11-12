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

render(<Erase />);
