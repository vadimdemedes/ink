'use strict';

const unmount = tree => {
	if (!tree || typeof tree === 'string') {
		return;
	}

	if (Array.isArray(tree)) {
		return tree.forEach(unmount);
	}

	unmount(tree.children);
	tree.unmount();
};

module.exports = unmount;
