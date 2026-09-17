import React, {useEffect} from 'react';
import {render, useStderr, Text} from '../../src/index.js';

function WriteToStderr() {
	const {write} = useStderr();

	useEffect(() => {
		write('Hello from Ink to stderr\n');
	}, [write]);

	return <Text>Hello World</Text>;
}

const app = render(<WriteToStderr />, {patchConsole: false});

await app.waitUntilExit();
console.log('exited');
