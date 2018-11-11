import React from 'react';
import logUpdate from 'log-update';
import throttle from 'lodash.throttle';
import createReconciler from './create-reconciler';
import createRenderer from './create-renderer';
import diffString from './diff-string';
import {createNode} from './dom';
import App from './components/App';

export default (node, options = {}) => {
	// Stream was passed instead of `options` object
	if (typeof options.write === 'function') {
		options = {
			stdout: options,
			stdin: process.stdin
		};
	}

	options = {
		stdout: process.stdout,
		stdin: process.stdin,
		debug: false,
		...options
	};

	const rootNode = createNode('root');
	const render = createRenderer({
		terminalWidth: options.stdout.columns
	});

	const log = logUpdate.create(options.stdout);

	// Ignore last render after unmounting a tree to prevent empty output before exit
	let ignoreRender = false;

	// Store last output to only rerender when needed
	let lastOutput = '';
	let lastStaticOutput = '';

	const onRender = () => {
		if (ignoreRender) {
			return;
		}

		const {output, staticOutput} = render(rootNode);

		if (options.debug) {
			options.stdout.write((staticOutput || '') + output);
			return;
		}

		// If <Static> part of the output has changed, calculate the difference
		// between the last <Static> output and log it to stdout.
		// To ensure static output is cleanly rendered before main output, clear main output first
		if (staticOutput && staticOutput !== lastStaticOutput) {
			log.clear();
			options.stdout.write(diffString(lastStaticOutput, staticOutput));
			log(output);

			lastStaticOutput = staticOutput;
		}

		if (output !== lastOutput) {
			log(output);
			lastOutput = output;
		}
	};

	const throttledRender = options.debug ? onRender : throttle(onRender, 50, {
		leading: true,
		trailing: true
	});

	const reconciler = options.stdout._inkReconciler || createReconciler(throttledRender);

	if (!options.stdout._ink) {
		options.stdout._ink = true;
		options.stdout._inkReconciler = reconciler;
		options.stdout._inkContainer = reconciler.createContainer(rootNode, false);
	}

	const tree = (
		<App stdin={options.stdin} stdout={options.stdout}>
			{node}
		</App>
	);

	reconciler.updateContainer(tree, options.stdout._inkContainer);

	return () => {
		if (typeof throttledRender.cancel === 'function') {
			throttledRender.cancel();
			onRender();
			log.done();
		}

		ignoreRender = true;
		reconciler.updateContainer(null, options.stdout._inkContainer);
	};
};
