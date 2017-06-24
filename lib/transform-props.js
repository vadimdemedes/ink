'use strict';

module.exports = props => {
	let {children} = props;

	if (children.length === 1 && typeof children[0] === 'function') {
		children = children[0];
	}

	return Object.assign({}, props, {children});
};
