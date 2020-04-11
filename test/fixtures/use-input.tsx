import React, {FC} from 'react';
import {render, useInput, AppContext} from '../../src';

const UserInput: FC<{ test: string }> = ({test}) => {
	const {exit} = React.useContext(AppContext);

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

		if (test === 'upArrow' && key.upArrow) {
			exit();
			return;
		}

		if (test === 'downArrow' && key.downArrow) {
			exit();
			return;
		}

		if (test === 'leftArrow' && key.leftArrow) {
			exit();
			return;
		}

		if (test === 'rightArrow' && key.rightArrow) {
			exit();
			return;
		}

		throw new Error('Crash');
	});

	return null;
};

const app = render(<UserInput test={process.argv[2]}/>);

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
