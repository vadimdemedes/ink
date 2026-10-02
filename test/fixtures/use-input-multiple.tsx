import process from 'node:process';
import React, {useState, useCallback, useEffect} from 'react';
import {render, useInput, useApp, Text} from '../../src/index.js';

function App() {
	const {exit} = useApp();
	const [input, setInput] = useState('');

	const handleInput = useCallback((newInput: string) => {
		setInput((previousInput: string) => previousInput + newInput);
	}, []);

	useInput(handleInput);
	useInput(handleInput, {isActive: false});

	useEffect(() => {
		process.stdout.write('__READY__');
	}, []);

	useEffect(() => {
		const timer = setTimeout(exit, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [exit]);

	return <Text>{input}</Text>;
}

const app = render(<App />);

await app.waitUntilExit();
console.log('exited');
