import React, {useState, useEffect} from 'react';
import {render, Text, useApp} from '../../src/index.js';

function Test() {
	const [counter, setCounter] = useState(0);
	const {exit} = useApp();

	useEffect(() => {
		setTimeout(() => {
			exit(new Error('errored'));
		}, 500);

		const timer = setInterval(() => {
			setCounter(previous => previous + 1);
		}, 100);

		return () => {
			clearInterval(timer);
		};
	}, [exit]);

	return <Text>Counter: {counter}</Text>;
}

const app = render(<Test />);

try {
	await app.waitUntilExit();
} catch (error: unknown) {
	console.log((error as any).message);
}
