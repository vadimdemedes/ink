import process from 'node:process';
import React, {useEffect} from 'react';
import {Text, render, useStdin} from '../../src/index.js';

function Test() {
	const {setRawMode} = useStdin();

	useEffect(() => {
		setRawMode(true);

		const timer = setTimeout(() => {
			setRawMode(false);
			setRawMode(true);

			// Start the test
			process.stdout.write('s');
		}, 500);

		return () => {
			clearTimeout(timer);
		};
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
