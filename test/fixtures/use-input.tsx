import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

function UserInput({test}: {readonly test: string | undefined}) {
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

		if (test === 'uppercase' && input === '\r' && !key.shift) {
			exit();
			return;
		}

		if (test === 'pastedCarriageReturn' && input === '\rtest') {
			exit();
			return;
		}

		if (test === 'pastedTab' && input === '\ttest') {
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

		if (test === 'upArrowMeta' && key.upArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'downArrowMeta' && key.downArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'leftArrowMeta' && key.leftArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'rightArrowMeta' && key.rightArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'upArrowCtrl' && key.upArrow && key.ctrl) {
			exit();
			return;
		}

		if (test === 'downArrowCtrl' && key.downArrow && key.ctrl) {
			exit();
			return;
		}

		if (test === 'leftArrowCtrl' && key.leftArrow && key.ctrl) {
			exit();
			return;
		}

		if (test === 'rightArrowCtrl' && key.rightArrow && key.ctrl) {
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

		if (test === 'home' && key.home && !key.meta) {
			exit();
			return;
		}

		if (test === 'end' && key.end && !key.meta) {
			exit();
			return;
		}

		if (test === 'tab' && input === '' && key.tab && !key.ctrl) {
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

		// Kitty keyboard protocol test cases

		// Test that shift+enter is distinguishable from plain enter
		// This is a key benefit of the Kitty protocol
		if (test === 'kittyShiftEnter' && key.return && key.shift) {
			exit();
			return;
		}

		// Test that ctrl+i is distinguishable from tab
		// In legacy mode, ctrl+i sends the same code as tab (\t)
		// With Kitty protocol, we can distinguish them
		if (test === 'kittyCtrlI' && input === 'i' && key.ctrl && !key.tab) {
			exit();
			return;
		}

		// Test basic Kitty sequence parsing for a letter
		if (
			test === 'kittyBasicLetter' &&
			input === 'a' &&
			!key.ctrl &&
			!key.shift &&
			!key.meta
		) {
			exit();
			return;
		}

		// Test alt modifier with Kitty protocol
		if (test === 'kittyAltLetter' && input === 'a' && key.meta && !key.ctrl) {
			exit();
			return;
		}

		// Test super modifier (only available via Kitty protocol)
		if (test === 'kittySuperKey' && input === 'a' && key.super && !key.ctrl) {
			exit();
			return;
		}

		// Test combined modifiers (ctrl+alt)
		if (test === 'kittyCtrlAlt' && input === 'a' && key.ctrl && key.meta) {
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
