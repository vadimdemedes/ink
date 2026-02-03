import {act} from 'react';
import {render} from '../../src/index.js';
import createStdout from './create-stdout.js';

type RenderToStringOptions = {
	columns?: number;
	isScreenReaderEnabled?: boolean;
};

/**
Synchronous render to string (legacy mode).
*/
export const renderToString: (
	node: React.JSX.Element,
	options?: RenderToStringOptions,
) => string = (node, options) => {
	const stdout = createStdout(options?.columns ?? 100);

	render(node, {
		stdout,
		debug: true,
		isScreenReaderEnabled: options?.isScreenReaderEnabled,
	});

	const output = stdout.get();
	return output;
};

/**
Async render to string with concurrent mode support.

Uses `act()` to properly flush updates.
*/
export const renderToStringAsync: (
	node: React.JSX.Element,
	options?: RenderToStringOptions,
) => Promise<string> = async (node, options) => {
	const stdout = createStdout(options?.columns ?? 100);

	await act(async () => {
		render(node, {
			stdout,
			debug: true,
			isScreenReaderEnabled: options?.isScreenReaderEnabled,
			concurrent: true,
		});
	});

	const output = stdout.get();
	return output;
};
