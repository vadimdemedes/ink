import React from 'react';
import {Box, Text, render} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

function Clear() {
	return (
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>
	);
}

const {clear} = render(<Clear />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

clear();
