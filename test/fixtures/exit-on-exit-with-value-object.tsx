import React, {useEffect} from 'react';
import {render, Text, useApp} from '../../src/index.js';

function Test() {
	const {exit} = useApp();

	useEffect(() => {
		setTimeout(() => {
			exit({message: 'hello from ink object'});
		}, 500);
	});

	return <Text>Testing</Text>;
}

const app = render(<Test />);
const result = await app.waitUntilExit();
console.log(`result:${(result as {message: string}).message}`);
