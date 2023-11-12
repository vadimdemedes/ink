import React, {useState} from 'react';
import {Box, Static, Text, render, useInput} from '../../src/index.js';

function Test() {
	const [fullHeight, setFullHeight] = useState(true);

	useInput(
		input => {
			if (input === 'x') {
				setFullHeight(false);
			}
		},
		{isActive: fullHeight}
	);

	return (
		<>
			<Static items={['X', 'Y', 'Z']}>
				{item => <Text key={item}>{item}</Text>}
			</Static>

			<Box flexDirection="column">
				<Text>A</Text>
				<Text>B</Text>
				{fullHeight && <Text>C</Text>}
			</Box>
		</>
	);
}

render(<Test />);
