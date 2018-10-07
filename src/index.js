import React from 'react';
import undom from 'undom';
import logUpdate from 'log-update';
import debounce from 'debounce-fn';
import createReconciler from './create-reconciler';
import createRenderer from './create-renderer';
import App from './components/App';

export {default as Box} from './components/Box';
export {default as Text} from './components/Text';
export {default as Color} from './components/Color';
export {default as StdinContext} from './components/StdinContext';
export {default as StdoutContext} from './components/StdoutContext';

export const render = (node, options = {}) => {
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

	const onRender = () => {
		if (ignoreRender) {
			return;
		}

		const output = render(document.body);

		if (options.debug) {
			options.stdout.write(output);
			return;
		}

		log(output);
	};

	const debouncedRender = options.debug ? onRender : debounce(onRender);
	const reconciler = createReconciler(document, debouncedRender);

	if (!options.stdout._inkContainer) {
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
