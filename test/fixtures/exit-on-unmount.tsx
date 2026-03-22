import React, {useState, useEffect} from 'react';
import {render, Text} from '../../src/index.js';

function Test() {
	const [counter, setCounter] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setCounter(previous => previous + 1);
		}, 100);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return <Text>Counter: {counter}</Text>;
}

const app = render(<Test />);

setTimeout(() => {
	app.unmount();
}, 500);

await app.waitUntilExit();
console.log('exited');
