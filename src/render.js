import React from 'react';
import undom from 'undom';
import logUpdate from 'log-update';
import debounce from 'debounce-fn';
import createReconciler from './create-reconciler';
import createRenderer from './create-renderer';
import diffString from './diff-string';
import App from './components/App';

export default (node, options = {}) => {
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

	const document = undom();
	const render = createRenderer({
		terminalWidth: options.stdout.columns
	});

	const log = logUpdate.create(options.stdout);

	// Ignore last render after unmounting a tree to prevent empty output before exit
	let ignoreRender = false;

	// Store last <Static> output to only rerender when needed
	let lastStaticOutput = '';

	const onRender = () => {
		if (ignoreRender) {
			return;
		}

		const {output, staticOutput} = render(document.body);

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

			lastStaticOutput = staticOutput;
		}

		log(output);
	};

	const debouncedRender = options.debug ? onRender : debounce(onRender);
	const reconciler = options.stdout._inkReconciler || createReconciler(document, debouncedRender);

	if (!options.stdout._ink) {
		options.stdout._ink = true;
		options.stdout._inkReconciler = reconciler;
		options.stdout._inkContainer = reconciler.createContainer(document.body, false);
	}

	const tree = (
		<App stdin={options.stdin} stdout={options.stdout}>
			{node}
		</App>
	);

	reconciler.updateContainer(tree, options.stdout._inkContainer);

	return () => {
		if (typeof debouncedRender.cancel === 'function') {
			debouncedRender.cancel();
			onRender();
			log.done();
		}

		ignoreRender = true;
		reconciler.updateContainer(null, options.stdout._inkContainer);
	};
};
