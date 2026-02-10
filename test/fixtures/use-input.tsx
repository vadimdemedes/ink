import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

function UserInput({test}: {readonly test: string | undefined}) {
	const {exit} = useApp();
	const rapidDownArrowCountRef = React.useRef(0);

	React.useEffect(() => {
		if (test !== 'rapidArrowsEnter') {
			return;
		}

		const timeout = setTimeout(() => {
			throw new Error(
				`Expected 3 down arrows and enter, received ${rapidDownArrowCountRef.current} down arrow events`,
			);
		}, 6000);

		return () => {
			clearTimeout(timeout);
		};
	}, [test]);

	useInput((input, key) => {
		if (test === 'rapidArrowsEnter') {
			if (key.downArrow) {
				rapidDownArrowCountRef.current++;
				return;
			}

			if (key.return) {
				if (rapidDownArrowCountRef.current === 3) {
					exit();
					return;
				}

				throw new Error(
					`Expected enter after 3 down arrows, received ${rapidDownArrowCountRef.current}`,
				);
			}

			throw new Error('Expected only down arrows and enter');
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

		if (test === 'escapeBracketPrefix' && input === '[' && !key.meta) {
			exit();
			return;
		}

		if (test === 'metaUpperO' && input === 'O' && key.meta) {
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

		if (test === 'returnMeta' && key.return && key.meta) {
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
