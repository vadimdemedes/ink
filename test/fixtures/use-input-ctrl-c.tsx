import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

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

await app.waitUntilExit();
console.log('exited');
