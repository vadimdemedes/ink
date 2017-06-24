'use strict';

const logUpdate = require('log-update');
const StringComponent = require('./lib/string-component');
const Component = require('./lib/component');
const renderToString = require('./lib/render-to-string');
const unmount = require('./lib/unmount');
const diff = require('./lib/diff');
const h = require('./lib/h');
const Newline = require('./lib/components/newline');
const Indent = require('./lib/components/indent');
const Group = require('./lib/components/group');
const Colors = require('./lib/components/colors');

exports.StringComponent = StringComponent;
exports.Component = Component;
exports.h = h;
exports.Newline = Newline;
exports.Indent = Indent;
exports.Group = Group;
Object.assign(exports, Colors);

const noop = () => {};

exports.diff = diff;
exports.renderToString = renderToString;

const render = (nextTree, prevTree, onUpdate = noop, context = {}) => {
	return diff(prevTree, nextTree, onUpdate, context);
};

exports.render = render;

exports.mount = (tree, stream) => {
	const log = logUpdate.create(stream || process.stdout);

	let isUnmounted = false;
	let currentTree;
	const context = {};

	const onUpdate = () => {
		if (isUnmounted) {
			return;
		}

		const nextTree = render(tree, currentTree, onUpdate, context);
		log(renderToString(nextTree));
		currentTree = nextTree;
	};

	currentTree = render(tree, null, onUpdate, context);
	log(renderToString(currentTree));

	return () => {
		if (isUnmounted) {
			return;
		}

		isUnmounted = true;
		unmount(currentTree);
		log.done();
	};
};
