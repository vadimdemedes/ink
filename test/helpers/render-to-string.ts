import {render} from '../../src/index.js';
import createStdout from './create-stdout.js';

export const renderToString: (
	node: React.JSX.Element,
	options?: {columns?: number; isScreenReaderEnabled?: boolean},
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
