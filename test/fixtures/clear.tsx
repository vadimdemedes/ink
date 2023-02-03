import React from 'react';
import {Box, Text, render} from '../../src/index.js';

const Clear = () => (
	<Box flexDirection="column">
		<Text>A</Text>
		<Text>B</Text>
		<Text>C</Text>
	</Box>
);

const {clear} = render(<Clear />);
clear();
