'use strict';

const isEqual = require('lodash.isequal');
const {getInstance, getOrCreateInstance} = require('./instance');
const VNode = require('./vnode');

const diff = (prevNode, nextNode, onUpdate, context) => {
	const prevInstance = getInstance(prevNode);

	if (typeof nextNode === 'number') {
		if (prevNode instanceof VNode) {
			prevInstance.unmount();
		}

		return String(nextNode);
	}

	if (!nextNode || typeof nextNode === 'boolean') {
		if (prevNode instanceof VNode) {
			prevInstance.unmount();
		}

		return null;
	}

	if (typeof nextNode === 'string') {
		if (prevNode instanceof VNode) {
			prevInstance.unmount();
		}

		return nextNode;
	}

	const nextInstance = getOrCreateInstance(nextNode);

	nextInstance.context = context;
	nextInstance.onUpdate = onUpdate;

	if (!(prevNode instanceof VNode)) {
		nextInstance.mount();
		return nextNode;
	}

	if (prevNode.component !== nextNode.component) {
		prevInstance.unmount();
		nextInstance.mount();
		return nextNode;
	}

	const shouldUpdate = prevInstance.shouldComponentUpdate(nextNode.props);
	const prevChildren = [].slice.call(prevNode.children);

	if (!isEqual(prevNode.props, nextNode.props)) {
		prevInstance.props = nextNode.props;
	}

	if (shouldUpdate) {
		prevInstance.rerender();
	}

	const nextChildren = prevNode.children;

	const length = Math.max(prevChildren.length, nextChildren.length);
	const reconciledChildren = [];

	for (let index = 0; index < length; index++) {
		const childNode = diff(prevChildren[index], nextChildren[index], onUpdate, context);
		reconciledChildren.push(childNode);
	}

	prevInstance.children = reconciledChildren;

	return prevNode;
};

module.exports = diff;
