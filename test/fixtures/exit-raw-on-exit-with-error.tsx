import React, {useEffect} from 'react';
import {render, Text, useApp, useStdin} from '../../src/index.js';

function Test() {
	const {exit} = useApp();
	const {setRawMode} = useStdin();

	useEffect(() => {
		setRawMode(true);

		setTimeout(() => {
			exit(new Error('errored'));
		}, 500);
	}, [exit, setRawMode]);

	return <Text>Hello World</Text>;
}

const app = render(<Test />);

try {
	await app.waitUntilExit();
} catch (error: unknown) {
	console.log((error as any).message);
}
