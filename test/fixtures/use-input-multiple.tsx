import process from 'node:process';
import React, {useState, useCallback, useEffect} from 'react';
import {render, useInput, useApp, Text} from '../../src/index.js';

function App() {
	const {exit} = useApp();
	const [input, setInput] = useState('');

	const handleInput = useCallback((input: string) => {
		setInput((previousInput: string) => previousInput + input);
	}, []);

	useInput(handleInput);
	useInput(handleInput, {isActive: false});

	useEffect(() => {
		process.stdout.write('__READY__');
	}, []);

	useEffect(() => {
		setTimeout(exit, 100);
	}, []);

	return <Text>{input}</Text>;
}

const app = render(<App />);

await app.waitUntilExit();
console.log('exited');
