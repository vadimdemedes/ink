import React, {useEffect} from 'react';
import {render, Text, useApp} from '../../src/index.js';

function Test() {
	const {exit} = useApp();

	useEffect(() => {
		const timer = setTimeout(() => {
			exit('hello from ink');
		}, 500);

		return () => {
			clearTimeout(timer);
		};
	});

	return <Text>Testing</Text>;
}

const app = render(<Test />);
const result = await app.waitUntilExit();
console.log(`result:${String(result)}`);
