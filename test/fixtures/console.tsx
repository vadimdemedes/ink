import React, {useEffect} from 'react';
import {Text, render} from '../../src/index.js';

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
console.log('First log');
unmount();
console.log('Second log');
