'use strict';

const logUpdate = require('log-update');
const StringComponent = require('./lib/string-component');
const Component = require('./lib/component');
const renderToString = require('./lib/render-to-string');
const callTree = require('./lib/call-tree');
const diff = require('./lib/diff');
const h = require('./lib/h');
const Newline = require('./lib/components/newline');
const Indent = require('./lib/components/indent');
const Group = require('./lib/components/group');
const Text = require('./lib/components/text');

exports.StringComponent = StringComponent;
exports.Component = Component;
exports.h = h;
exports.Newline = Newline;
exports.Indent = Indent;
exports.Group = Group;
exports.Text = Text;

const noop = () => {};

const unmount = tree => callTree(tree, 'unmount');
const didMount = tree => callTree(tree, 'didMount');
const didUpdate = tree => callTree(tree, 'didUpdate');

const build = (nextTree, prevTree, onUpdate = noop, context = {}, autoLifecycle = true) => {
	const reconciledTree = diff(prevTree, nextTree, onUpdate, context);

	if (autoLifecycle) {
		didMount(reconciledTree);
		didUpdate(reconciledTree);
	}

	return reconciledTree;
};

exports.build = build;
exports.diff = diff;

exports.renderToString = (...args) => renderToString(build(...args));

exports.render = (tree, stream = process.stdout) => {
	const log = logUpdate.create(stream);

	const context = {};
	let isUnmounted = false;
	let currentTree;

	const update = () => {
		const nextTree = build(tree, currentTree, onUpdate, context, false); // eslint-disable-line no-use-before-define
		log(renderToString(nextTree));
		didMount(nextTree);
		didUpdate(nextTree);

		currentTree = nextTree;
	};

	const onUpdate = () => {
		if (isUnmounted) {
			return;
		}

		update();
	};

	update();

	return () => {
		if (isUnmounted) {
			return;
		}

		isUnmounted = true;
		unmount(currentTree);
		log.done();
	};
};
