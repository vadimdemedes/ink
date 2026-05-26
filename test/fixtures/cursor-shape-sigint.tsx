import React from 'react';
import {render, Text, useCursor} from '../../src/index.js';

function App() {
	const {setCursorShape} = useCursor();
	setCursorShape('bar');
	return <Text>waiting</Text>;
}

// Disable Ink's Ctrl-C handling so SIGINT actually reaches signal-exit,
// rather than being intercepted as keyboard input and turned into a graceful
// unmount. The whole point of this fixture is to exercise the signal path.
const {waitUntilExit} = render(<App />, {exitOnCtrlC: false});

await waitUntilExit();
