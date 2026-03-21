import React, {useEffect} from 'react';
import {render, Text, useApp, useStdin} from '../../src/index.js';

function Test() {
	const {exit} = useApp();
	const {setRawMode} = useStdin();

	useEffect(() => {
		setRawMode(true);
		setTimeout(exit, 500);
	}, [exit, setRawMode]);

	return <Text>Hello World</Text>;
}

const app = render(<Test />);

await app.waitUntilExit();
console.log('exited');
