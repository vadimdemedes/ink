import React, {useEffect} from 'react';
import {Text, render} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

function App() {
	useEffect(() => {
		const timer = setTimeout(() => {}, 1000);

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return <Text>Hello World</Text>;
}

const {unmount} = render(<App />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

console.log('First log');
unmount();
console.log('Second log');
