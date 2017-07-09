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
const Text = require('./lib/components/text');

exports.StringComponent = StringComponent;
exports.Component = Component;
exports.h = h;
exports.Newline = Newline;
exports.Indent = Indent;
exports.Text = Text;

const noop = () => {};

exports.diff = diff;
exports.renderToString = renderToString;

const unmount = tree => callTree(tree, 'unmount');
const didMount = tree => callTree(tree, 'didMount');
const didUpdate = tree => callTree(tree, 'didUpdate');

const render = (nextTree, prevTree, onUpdate = noop, context = {}, autoLifecycle = true) => {
	const reconciledTree = diff(prevTree, nextTree, onUpdate, context);

	if (autoLifecycle) {
		didMount(reconciledTree);
		didUpdate(reconciledTree);
	}

	return reconciledTree;
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

		const nextTree = render(tree, currentTree, onUpdate, context, false);
		log(renderToString(nextTree));
		didMount(nextTree);
		didUpdate(nextTree);

		currentTree = nextTree;
	};

	currentTree = render(tree, null, onUpdate, context, false);
	log(renderToString(currentTree));
	didMount(currentTree);
	didUpdate(currentTree);

	return () => {
		if (isUnmounted) {
			return;
		}

		isUnmounted = true;
		unmount(currentTree);
		log.done();
	};
};
