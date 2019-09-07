'use strict';
const React = require('react');
const {render, useKeypress} = require('../..');

const input = new Set('abcdefghijklmnopqrstuvwxyz'.split(''));

const KeypressTest = () => {
	useKeypress(str => {
		input.delete(str);
		if (input.size === 0) {
			app.unmount();
		}
	});
	return null;
};

const app = render(<KeypressTest/>);

(async () => {
	await app.waitUntilExit();
	console.log('exited');
})();
