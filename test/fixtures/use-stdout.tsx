import React, {useEffect} from 'react';
import {render, useStdout, Text} from '../../src/index.js';

function WriteToStdout() {
	const {write} = useStdout();

	useEffect(() => {
		write('Hello from Ink to stdout\n');
	}, []);

	return <Text>Hello World</Text>;
}

const app = render(<WriteToStdout />);

await app.waitUntilExit();
console.log('exited');
