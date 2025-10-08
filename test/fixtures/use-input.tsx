import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

function UserInput({test}: {readonly test: string | undefined}) {
	const {exit} = useApp();
	const arrowCountRef = React.useRef(0);
	const textEventCountRef = React.useRef(0);
	const mixedStageRef = React.useRef(0);
	const csiStageRef = React.useRef(0);
	const emojiCountRef = React.useRef(0);

	useInput((input, key) => {
		if (test === 'rapidArrows') {
			if (!key.downArrow || input !== '') {
				throw new Error('Expected down arrow event');
			}

			arrowCountRef.current++;

			if (arrowCountRef.current === 3) {
				exit();
				return;
			}

			if (arrowCountRef.current > 3) {
				throw new Error('Received extra down arrow events');
			}

			return;
		}

		if (test === 'coalescedText') {
			textEventCountRef.current++;

			if (textEventCountRef.current > 1) {
				throw new Error('Expected a single text event');
			}

			if (input === 'hello world') {
				exit();
				return;
			}

			throw new Error(`Unexpected text input: ${input}`);
		}

		if (test === 'mixedSequence') {
			const validators = [
				() => {
					if (!key.downArrow || input !== '') {
						throw new Error('Expected a down arrow as the first event');
					}
				},
				() => {
					if (input !== 'hello') {
						throw new Error('Expected plain text as the second event');
					}
				},
				() => {
					if (!key.downArrow || input !== '') {
						throw new Error('Expected a down arrow as the final event');
					}
				},
			];

			const validator = validators[mixedStageRef.current];

			if (!validator) {
				throw new Error('Received more events than expected');
			}

			validator();

			mixedStageRef.current++;

			if (mixedStageRef.current === 3) {
				exit();
			}

			return;
		}

		if (test === 'csiFinals') {
			const expected = ['[@', '[200~'];
			const index = csiStageRef.current;

			if (index >= expected.length) {
				throw new Error('Received more CSI sequences than expected');
			}

			if (input !== expected[index]) {
				throw new Error(`Unexpected CSI sequence: ${JSON.stringify(input)}`);
			}

			csiStageRef.current++;

			if (csiStageRef.current === expected.length) {
				exit();
			}

			return;
		}

		if (test === 'emojiPaste') {
			emojiCountRef.current++;

			if (emojiCountRef.current > 1) {
				throw new Error('Expected emoji paste to arrive as a single event');
			}

			if (input === '👋🌍') {
				exit();
				return;
			}

			throw new Error(`Unexpected emoji input: ${JSON.stringify(input)}`);
		}

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

		throw new Error('Crash');
	});

	return null;
}

const app = render(<UserInput test={process.argv[2]} />);

await app.waitUntilExit();
console.log('exited');
