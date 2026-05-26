import React, {useEffect} from 'react';
import {render, Text, useCursor} from '../../src/index.js';

function App() {
	const {setCursorShape} = useCursor();
	setCursorShape('bar');

	useEffect(() => {
		setTimeout(() => {
			throw new Error('intentional crash for cursor-shape restore test');
		}, 50);
	}, []);

	return <Text>about-to-crash</Text>;
}

render(<App />);
