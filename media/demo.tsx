import process from 'node:process';
import React, {useState, useEffect} from 'react';
import {render, Box, Text, useApp} from 'ink';

function Counter() {
	const [i, setI] = useState(0);
	const {exit} = useApp();

	useEffect(() => {
		const timer = setInterval(() => {
			setI(previous => {
				if (previous === 50) {
					exit();
				}

				return previous + 1;
			});
		}, 100);

		return () => {
			clearInterval(timer);
		};
	}, [exit]);

	return (
		<Box flexDirection="column">
			<Box>
				<Text color="blue">~/Projects/ink </Text>
			</Box>
			<Box>
				<Text color="magenta">❯ </Text>
				<Text color="green">node </Text>
				<Text>media/example</Text>
			</Box>
			<Text color="green">{i} tests passed</Text>
		</Box>
	);
}

render(<Counter />);
