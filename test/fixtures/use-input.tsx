import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

function UserInput({test}: {test: string | undefined}) {
	const {exit} = useApp();

	useInput((input, key) => {
		if (test === 'lowercase' && input === 'q') {
			exit();
			return;
		}

		if (test === 'uppercase' && input === 'Q' && key.shift) {
			exit();
			return;
		}

		if (test === 'escape' && key.escape) {
			exit();
			return;
		}

		if (test === 'ctrl' && input === 'f' && key.ctrl) {
			exit();
			return;
		}

		if (test === 'meta' && input === 'm' && key.meta) {
			exit();
			return;
		}

		if (test === 'upArrow' && key.upArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'downArrow' && key.downArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'leftArrow' && key.leftArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'rightArrow' && key.rightArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'pageDown' && key.pageDown && !key.meta) {
			exit();
			return;
		}

		if (test === 'pageUp' && key.pageUp && !key.meta) {
			exit();
			return;
		}

		if (test === 'tab' && input === '' && key.tab) {
			exit();
			return;
		}

		if (test === 'shiftTab' && input === '' && key.tab && key.shift) {
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

		if (test === 'remove' && input === '' && key.delete) {
			exit();
			return;
		}

		throw new Error('Crash');
	});

	return null;
}

const app = render(<UserInput test={process.argv[2]} />);

await app.waitUntilExit();
console.log('exited');
