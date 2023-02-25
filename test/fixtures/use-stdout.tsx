import React, {useEffect} from 'react';
import delay from 'delay';
import {render, useStdout, Box, Text} from '../../src/index.js';

function WriteToStdout() {
	const {write} = useStdout();

	useEffect(() => {
		const run = async () => {
			await delay(1000);
			write('Hello from Ink to stdout\n');
		};

		void run();
	}, []);

	return (
		<Box paddingBottom={1}>
			<Text>Hello World</Text>
		</Box>
	);
}

await delay(1000);
const app = render(<WriteToStdout />, {debug: false});

await app.waitUntilExit();
console.log('exited');
