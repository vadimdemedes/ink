import React, {useEffect} from 'react';
import {render, Text, useApp} from '../../src/index.js';

function AlternateBuffer() {
	const {exit} = useApp();

	useEffect(() => {
		// Exit after first render
		const timer = setTimeout(() => {
			exit();
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [exit]);

	return <Text>Hello World</Text>;
}

const {waitUntilExit} = render(<AlternateBuffer />, {
	alternateBuffer: true,
	alternateBufferAlreadyActive: true,
});

await waitUntilExit();
