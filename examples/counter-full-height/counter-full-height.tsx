import React from 'react';
import {Box, render, Text} from '../../src/index.js';

function CounterFullHeight() {
	const [counter, setCounter] = React.useState(0);

	React.useEffect(() => {
		const timer = setInterval(() => {
			setCounter(prevCounter => prevCounter + 1); // eslint-disable-line unicorn/prevent-abbreviations
		}, 100);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return (
		<Box borderStyle="round" flexGrow={1}>
			<Text color="green">{counter} tests passed</Text>
		</Box>
	);
}

render(<CounterFullHeight />, {fullHeight: true});
