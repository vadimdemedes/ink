import React from 'react';
import throttle from 'lodash.throttle';
import logUpdate from './vendor/log-update';
import createReconciler from './create-reconciler';
import createRenderer from './create-renderer';
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

	const onRender = () => {
		if (ignoreRender) {
			return;
		}

		const output = render(rootNode);

		if (options.debug) {
			options.stdout.write(output);
			return;
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
