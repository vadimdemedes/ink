'use strict';

const {getInstance} = require('./instance');

const call = (tree, method) => {
	if (!tree || typeof tree === 'string') {
		return;
	}

	if (Array.isArray(tree)) {
		return tree.forEach(node => call(node, method));
	}

	call(tree.children, method);
	getInstance(tree)[method]();
};

module.exports = call;
