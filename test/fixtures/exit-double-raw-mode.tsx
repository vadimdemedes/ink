import process from 'node:process';
import React, {useEffect} from 'react';
import {Text, render, useStdin} from '../../src/index.js';

function Test() {
	const {setRawMode} = useStdin();

	useEffect(() => {
		setRawMode(true);

		setTimeout(() => {
			setRawMode(false);
			setRawMode(true);

			// Start the test
			process.stdout.write('s');
		}, 500);
	}, [setRawMode]);

	return <Text>Hello World</Text>;
}

const {unmount, waitUntilExit} = render(<Test />);

process.stdin.on('data', data => {
	if (String(data) === 'q') {
		unmount();
	}
});

await waitUntilExit();
console.log('exited');
