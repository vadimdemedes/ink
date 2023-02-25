import React, {useEffect} from 'react';
import delay from 'delay';
import {render, useStdout, Text} from '../../src/index.js';

function WriteToStdout() {
	console.log('render');
	const {write} = useStdout();

	useEffect(() => {
		console.log('useEffect');
		const run = async () => {
			await delay(1000);
			write('Hello from Ink to stdout\n');
		};

		void run();
	}, []);

	return <Text>Hello World</Text>;
}

await delay(1000);
const app = render(<WriteToStdout />, {debug: true});

await app.waitUntilExit();
console.log('exited');
