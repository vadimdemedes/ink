'use strict';

const options = require('./options');

const queue = [];

const rerender = () => {
	while (queue.length > 0) {
		const callback = queue.pop();
		callback();
	}
};

exports.rerender = rerender;

exports.enqueueUpdate = callback => {
	queue.push(callback);
	options.deferRendering(rerender);
};
