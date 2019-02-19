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
		exitOnCtrlC: true,
		...options
	};

	const rootNode = createNode('root');
	const render = createRenderer({
		terminalWidth: options.stdout.columns
	});

	const log = logUpdate.create(options.stdout);
	const throttledLog = options.debug ? log : throttle(log, {
		leading: true,
		trailing: true
	});

	// Ignore last render after unmounting a tree to prevent empty output before exit
	let ignoreRender = false;

	// Store last output to only rerender when needed
	let lastOutput = '';
	let lastStaticOutput = '';

	// This variable is used only in debug mode to store full static output
	// so that it's rerendered every time, not just new static parts, like in non-debug mode
	let fullStaticOutput = '';

	const onRender = () => {
		if (ignoreRender) {
			return;
		}

		const {output, staticOutput} = render(rootNode);

		// If <Static> output isn't empty, it means new children have been added to it
		const hasNewStaticOutput = staticOutput && staticOutput !== '\n' && staticOutput !== lastStaticOutput;

		if (options.debug) {
			if (hasNewStaticOutput) {
				fullStaticOutput += staticOutput;
				lastStaticOutput = staticOutput;
			}

			options.stdout.write(fullStaticOutput + output);
			return;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasNewStaticOutput) {
			log.clear();
			options.stdout.write(staticOutput);
			log(output);

			lastStaticOutput = staticOutput;
		}

		if (output !== lastOutput) {
			throttledLog(output);

			lastOutput = output;
		}
	};

	const reconciler = options.stdout._inkReconciler || createReconciler(onRender);

	if (!options.stdout._ink) {
		options.stdout._ink = true;
		options.stdout._inkReconciler = reconciler;
		options.stdout._inkContainer = reconciler.createContainer(rootNode, false);
	}

	const unmount = () => {
		onRender();
		log.done();
		ignoreRender = true;
		reconciler.updateContainer(null, options.stdout._inkContainer);
	};

	let resolveExitPromise;
	const exitPromise = new Promise(resolve => {
		resolveExitPromise = resolve;
	});

	const onExit = () => {
		unmount();
		resolveExitPromise();
	};

	const tree = (
		<App stdin={options.stdin} stdout={options.stdout} exitOnCtrlC={options.exitOnCtrlC} onExit={onExit}>
			{node}
		</App>
	);

	reconciler.updateContainer(tree, options.stdout._inkContainer);

	return {
		waitUntilExit() {
			return exitPromise;
		},
		unmount
	};
};
