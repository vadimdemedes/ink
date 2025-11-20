import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

function UserInput() {
	const {exit} = useApp();

	useInput((input, key) => {
		if (input === 'c' && key.ctrl) {
			exit();
			return;
		}

		throw new Error('Crash');
	});

	return null;
}

const app = render(<UserInput />, {exitOnCtrlC: false});

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

await app.waitUntilExit();
console.log('exited');
