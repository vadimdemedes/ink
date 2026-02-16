import React, {useEffect} from 'react';
import {render, Text, useApp} from '../../src/index.js';

function Test() {
	const {exit} = useApp();

	useEffect(() => {
		setTimeout(() => {
			const error = new Error('errored');
			(error as Error & {value: string}).value = 'hello from error';
			exit(error);
		}, 500);
	}, []);

	return <Text>Testing</Text>;
}

const app = render(<Test />);

try {
	await app.waitUntilExit();
} catch (error: unknown) {
	console.log((error as Error).message);
}
