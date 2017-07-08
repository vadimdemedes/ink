'use strict';

const flatten = require('lodash.flattendeep');
const VNode = require('./vnode');

let warnedNonComponent = false;

module.exports = (component, props, ...children) => {
	if (!warnedNonComponent && typeof component !== 'function' && typeof component !== 'string') {
		const error = new Error(`ink.h: expected component to be a function, but received "${component}". You may have forgotten to export a component.`);
		warnedNonComponent = true;
		console.error(error);
	}

	props = props || {};

	const readyChildren = [];

	if (children.length > 0) {
		props.children = children;
	}

	flatten(props.children).forEach(child => {
		if (typeof child === 'number') {
			child = String(child);
		}

		if (typeof child === 'boolean' || child === null) {
			child = '';
		}

		if (typeof child === 'string') {
			if (typeof readyChildren[readyChildren.length - 1] === 'string') {
				readyChildren[readyChildren.length - 1] += child;
			} else {
				readyChildren.push(child);
			}
		} else {
			readyChildren.push(child);
		}
	});

	props.children = readyChildren;

	return new VNode(component, props);
};
