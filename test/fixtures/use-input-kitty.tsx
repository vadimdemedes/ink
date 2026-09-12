import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

function UserInput({test}: {readonly test: string | undefined}) {
	const {exit} = useApp();

	useInput((input, key) => {
		if (
			test === 'specialModifiers' &&
			input === '' &&
			key.upArrow &&
			key.super &&
			!key.meta &&
			key.eventType === 'press'
		) {
			exit();
			return;
		}

		if (
			test === 'keypadNavigation' &&
			input === '' &&
			key.downArrow &&
			key.ctrl &&
			key.eventType === 'repeat'
		) {
			exit();
			return;
		}

		if (
			test === 'alternateKeys' &&
			input === 'A' &&
			key.ctrl &&
			key.shift &&
			key.eventType === 'repeat'
		) {
			exit();
			return;
		}

		if (test === 'keypadText' && input === '0' && key.numLock) {
			exit();
			return;
		}

		if (test === 'keypadEnter' && input === '\r' && key.return) {
			exit();
			return;
		}

		if (
			test === 'associatedText' &&
			input === 'å' &&
			key.eventType === 'press' &&
			!key.ctrl &&
			!key.meta &&
			!key.shift
		) {
			exit();
			return;
		}

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

		// Test uppercase text from Caps Lock without Shift.
		if (
			test === 'capsLockText' &&
			input === 'A' &&
			key.capsLock &&
			!key.shift
		) {
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

		if (test === 'backspace' && input === '' && key.backspace) {
			exit();
			return;
		}

		if (test === 'delete' && input === '' && key.delete) {
			exit();
			return;
		}

		// Test non-printable keys produce empty input
		if (test === 'nonPrintable' && input === '') {
			exit();
			return;
		}

		// Test Ctrl+letter provides the unshifted key as input.
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
