'use strict';
const React = require('react');
const {render, useInput, AppContext} = require('../..');

const UserInput = () => {
	const {exit} = React.useContext(AppContext);

	useInput(input => {
		if (input === 'q') {
			exit();
		}
	});

	return null;
};

const app = render(<UserInput/>);

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
