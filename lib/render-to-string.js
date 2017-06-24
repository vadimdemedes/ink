'use strict';

const StringComponent = require('./string-component');
const {getInstance} = require('./instance');

const renderToString = tree => {
	if (!tree) {
		return '';
	}

	if (typeof tree === 'string') {
		return tree;
	}

	if (Array.isArray(tree)) {
		return tree
			.map(renderToString)
			.join('');
	}

	const instance = getInstance(tree);

	if (instance.instance instanceof StringComponent) {
		const children = renderToString(tree.children);
		return instance.renderString(children);
	}

	return renderToString(tree.children);
};

module.exports = renderToString;
