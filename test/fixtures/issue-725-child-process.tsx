import React from 'react';
import {Text, useStdin, render} from '../../src/index.js';

function App() {
	const {isRawModeSupported} = useStdin();

	return <Text>{isRawModeSupported ? 'ready' : 'ready-stdin-not-tty'}</Text>;
}

const {waitUntilExit} = render(<App />);

await waitUntilExit();
console.log('exited');
