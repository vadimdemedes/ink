'use strict';

const {getInstance} = require('./instance');

const unmount = tree => {
	if (!tree || typeof tree === 'string') {
		return;
	}

	if (Array.isArray(tree)) {
		return tree.forEach(unmount);
	}

	unmount(tree.children);
	getInstance(tree).unmount();
};

module.exports = unmount;
