import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

function UserInput({test}: {readonly test: string | undefined}) {
	const {exit} = useApp();

	useInput((input, key) => {
		// Test super modifier (Cmd on Mac, Win on Windows)
		if (test === 'super' && key.super && input === 's') {
			exit();
			return;
		}

		// Test hyper modifier
		if (test === 'hyper' && key.hyper && input === 'h') {
			exit();
			return;
		}

		// Test capsLock
		if (test === 'capsLock' && key.capsLock) {
			exit();
			return;
		}

		// Test numLock
		if (test === 'numLock' && key.numLock) {
			exit();
			return;
		}

		// Test super+ctrl combination
		if (test === 'superCtrl' && key.super && key.ctrl && input === 's') {
			exit();
			return;
		}

		// Test repeat event type
		if (test === 'repeat' && key.eventType === 'repeat') {
			exit();
			return;
		}

		// Test release event type
		if (test === 'release' && key.eventType === 'release') {
			exit();
			return;
		}

		// Test press event type (default)
		if (test === 'press' && key.eventType === 'press' && input === 'a') {
			exit();
			return;
		}

		// Test escape with kitty protocol
		if (test === 'escapeKitty' && key.escape) {
			exit();
			return;
		}

		// Test non-printable keys produce empty input
		if (test === 'nonPrintable' && input === '') {
			exit();
			return;
		}

		// Test ctrl+letter via codepoint 1-26 form still provides input
		if (test === 'ctrlLetter' && input === 'a' && key.ctrl) {
			exit();
			return;
		}

		// Test space produces space character as input
		if (test === 'space' && input === ' ') {
			exit();
			return;
		}

		// Test return produces carriage return as input
		if (test === 'returnKey' && input === '\r') {
			exit();
			return;
		}

		throw new Error(`Unexpected input: ${JSON.stringify({input, key})}`);
	});

	React.useEffect(() => {
		process.stdout.write('__READY__');
	}, []);

	return null;
}

const app = render(<UserInput test={process.argv[2]} />, {
	kittyKeyboard: {mode: 'disabled'}, // Disable auto-detection for tests
});

await app.waitUntilExit();
console.log('exited');
