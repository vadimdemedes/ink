'use strict';

const StringComponent = require('./string-component');

const renderToString = vnode => {
	if (!vnode) {
		return '';
	}

	if (typeof vnode === 'string') {
		return vnode;
	}

	if (Array.isArray(vnode)) {
		return vnode
			.map(renderToString)
			.join('');
	}

	if (vnode.instance instanceof StringComponent) {
		const children = renderToString(vnode.children);
		return vnode.instance.renderString(children);
	}

	return renderToString(vnode.children);
};

module.exports = renderToString;
