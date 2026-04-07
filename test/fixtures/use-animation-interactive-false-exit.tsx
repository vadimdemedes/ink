import React from 'react';
import {Text, render, useAnimation, useApp} from '../../src/index.js';

function Spinner() {
	const {frame} = useAnimation({interval: 8});
	const {exit} = useApp();

	React.useEffect(() => {
		if (frame >= 3) {
			exit();
		}
	}, [exit, frame]);

	return <Text>{String(frame)}</Text>;
}

const {waitUntilExit} = render(<Spinner />, {interactive: false});

await waitUntilExit();
console.log('exited');
