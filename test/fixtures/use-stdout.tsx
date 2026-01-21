import React, {useEffect} from 'react';
import {render, useStdout, Text} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

function WriteToStdout() {
	const {write} = useStdout();

	useEffect(() => {
		write('Hello from Ink to stdout\n');
	}, []);

	return <Text>Hello World</Text>;
}

const app = render(<WriteToStdout />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

await app.waitUntilExit();
console.log('exited');
