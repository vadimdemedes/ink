import React, {FC, useState, useCallback, useEffect} from 'react';
import {render, useInput, useApp, Text} from '../../src';

const App: FC = () => {
	const {exit} = useApp();
	const [input, setInput] = useState('');

	const handleInput = useCallback((input: string) => {
		setInput((previousInput: string) => previousInput + input);
	}, []);

	useInput(handleInput);
	useInput(handleInput, {isActive: false});

	useEffect(() => {
		setTimeout(exit, 1000);
	}, []);

	return <Text>{input}</Text>;
};

const app = render(<App />);

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
