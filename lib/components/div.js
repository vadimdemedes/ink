'use strict';

const h = require('../h');

const Proxy = ({children}) => children;

module.exports = ({children, inline = false}) => {
	return h(Proxy, null, [
		children,
		inline ? null : '\n'
	]);
};
