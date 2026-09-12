import process from 'node:process';
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

const options =
	process.argv[2] === 'undefined' ? {patchConsole: undefined} : {};
const {unmount} = render(<App />, options);
console.log('First log');
unmount();
console.log('Second log');
