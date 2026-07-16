import React, {useEffect} from 'react';
import {render, Text, useCursor} from '../../src/index.js';

function App() {
	useCursor({shape: 'bar'});

	useEffect(() => {
		setTimeout(() => {
			throw new Error('intentional crash for cursor-shape restore test');
		}, 50);
	}, []);

	return <Text>about-to-crash</Text>;
}

render(<App />);
