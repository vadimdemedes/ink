import process from 'node:process';
import React, {useEffect} from 'react';
import {render, Text, usePaste} from '../../src/index.js';

function App() {
	// Enables raw mode and bracketed paste mode.
	usePaste(() => {});

	useEffect(() => {
		process.stdout.write('__READY__');

		return () => {
			process.stdout.write('unmounted');
		};
	}, []);

	return <Text>Hello World</Text>;
}

render(<App />, {alternateScreen: true});
