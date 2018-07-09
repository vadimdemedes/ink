'use strict';

const readline = require('readline');
const logUpdate = require('log-update');
const StringComponent = require('./lib/string-component');
const Component = require('./lib/component');
const renderToString = require('./lib/render-to-string');
const diff = require('./lib/diff');
const h = require('./lib/h');
const Indent = require('./lib/components/indent');
const Renderer = require('./lib/renderer');
const Color = require('./lib/components/color');
const Text = require('./lib/components/text');
const Bold = require('./lib/components/bold');
const Underline = require('./lib/components/underline');

exports.StringComponent = StringComponent;
exports.Component = Component;
exports.h = h;
exports.Fragment = h.Fragment;
exports.Indent = Indent;
exports.Renderer = Renderer;
exports.Color = Color;
exports.Text = Text;
exports.Underline = Underline;
exports.Bold = Bold;

const noop = () => {};

const build = (nextTree, prevTree, onUpdate = noop, context = {}) => {
	return diff(prevTree, nextTree, onUpdate, context);
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

	readline.emitKeypressEvents(stdin);

	if (stdin.isTTY) {
		stdin.setRawMode(true);
	}

	const currentTree = new Renderer(tree);
	currentTree.on('update', log);
	currentTree.update();

	const onKeyPress = (ch, key) => {
		if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
			exit(); // eslint-disable-line no-use-before-define
		}
	};

	if (stdin.isTTY) {
		stdin.on('keypress', onKeyPress);
		stdout.on('resize', currentTree.update);
	}

	const consoleMethods = ['dir', 'log', 'info', 'warn', 'error'];

	consoleMethods.forEach(method => {
		const originalFn = console[method];

		console[method] = (...args) => {
			log.clear();
			log.done();
			originalFn.apply(console, args);
			currentTree.update();
		};

		console[method].restore = () => {
			console[method] = originalFn;
		};
	});

	const exit = () => {
		if (stdin.isTTY) {
			stdin.setRawMode(false);
			stdin.removeListener('keypress', onKeyPress);
			stdin.pause();
			stdout.removeListener('resize', currentTree.update);
		}

		currentTree.unmount();
		log.done();

		consoleMethods.forEach(method => console[method].restore());
	};

	return exit;
};
