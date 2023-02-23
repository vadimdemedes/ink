import React, {useEffect} from 'react';
import delay from 'delay';
import {render, useStdout, Text} from '../../src/index.js';

function WriteToStdout() {
	const {write} = useStdout();

	useEffect(() => {
		write('Hello from Ink to stdout\n');
	}, []);

	return <Text>Hello World</Text>;
}

await delay(1000);
const app = render(<WriteToStdout />);

await app.waitUntilExit();
console.log('exited');
