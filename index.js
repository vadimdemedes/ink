'use strict';

const readline = require('readline');
const logUpdate = require('log-update');
const StringComponent = require('./lib/string-component');
const Component = require('./lib/component');
const renderToString = require('./lib/render-to-string');
const callTree = require('./lib/call-tree');
const diff = require('./lib/diff');
const h = require('./lib/h');
const Indent = require('./lib/components/indent');
const Text = require('./lib/components/text');

exports.StringComponent = StringComponent;
exports.Component = Component;
exports.h = h;
exports.Indent = Indent;
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

exports.render = (tree, options) => {
	if (options && typeof options.write === 'function') {
		options = {
			stdout: options
		};
	}

	const {stdin, stdout} = Object.assign({
		stdin: process.stdin,
		stdout: process.stdout
	}, options);

	const log = logUpdate.create(stdout);

	const context = {};
	let isUnmounted = false;
	let currentTree;

	readline.emitKeypressEvents(stdin);
	stdin.setRawMode(true);

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

	const onKeyPress = (ch, key) => {
		if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
			exit(); // eslint-disable-line no-use-before-define
		}
	};

	stdin.on('keypress', onKeyPress);
	stdout.on('resize', update);

	const consoleMethods = ['dir', 'log', 'info', 'warn', 'error'];

	consoleMethods.forEach(method => {
		const originalFn = console[method];

		console[method] = (...args) => {
			log.clear();
			log.done();
			originalFn.apply(console, args);
			update();
		};

		console[method].restore = () => {
			console[method] = originalFn;
		};
	});

	const exit = () => {
		if (isUnmounted) {
			return;
		}

		stdin.setRawMode(false);
		stdin.removeListener('keypress', onKeyPress);
		stdin.pause();
		stdout.removeListener('resize', update);

		isUnmounted = true;
		unmount(currentTree);
		log.done();

		consoleMethods.forEach(method => console[method].restore());
	};

	return exit;
};
