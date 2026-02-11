import React, {useEffect} from 'react';
import {render, Static, Text, useApp} from '../../src/index.js';

function Test() {
	const {exit} = useApp();

	useEffect(() => {
		exit(new Error('errored'));
	}, []);

	return (
		<>
			<Static items={['A', 'B', 'C']}>
				{item => <Text key={item}>{item}</Text>}
			</Static>
			<Text>Dynamic</Text>
		</>
	);
}

const app = render(<Test />);

try {
	await app.waitUntilExit();
} catch (error: unknown) {
	console.log((error as Error).message);
}
