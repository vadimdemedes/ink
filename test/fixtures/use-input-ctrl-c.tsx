import React, {FC} from 'react';
import {render, useInput, useApp} from '../..';

const UserInput: FC = () => {
	const {exit} = useApp();

	useInput((input, key) => {
		if (input === 'c' && key.ctrl) {
			exit();
			return;
		}

		throw new Error('Crash');
	});

	return null;
};

const app = render(<UserInput />, {exitOnCtrlC: false});

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
