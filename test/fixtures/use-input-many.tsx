import process from 'node:process';
import React, {useEffect} from 'react';
import {render, useInput, useApp, Text} from '../../src/index.js';

// Detect MaxListenersExceededWarning
process.on('warning', warning => {
	if (warning.name === 'MaxListenersExceededWarning') {
		console.log('MaxListenersExceededWarning');
	}
});

function InputHandler() {
	useInput(() => {});
	return null;
}

function App() {
	const {exit} = useApp();

	useEffect(() => {
		setTimeout(exit, 100);
	}, []);

	return (
		<>
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<InputHandler />
			<Text>ready</Text>
		</>
	);
}

const app = render(<App />);
await app.waitUntilExit();
console.log('exited');
