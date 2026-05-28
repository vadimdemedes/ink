import React from 'react';
import test from 'ava';
import stripAnsi from 'strip-ansi';
import {renderToString} from '../src/index.js';
import ErrorOverview from '../src/components/ErrorOverview.js';

const createErrorWithStack = (stack: string) => {
	const error = new Error('Oh no');
	error.stack = stack;

	return error;
};

test('renders native stack frames as raw lines', t => {
	const output = stripAnsi(
		renderToString(
			<ErrorOverview
				error={createErrorWithStack('Error: Oh no\n    at native')}
			/>,
		),
	);

	t.true(output.includes(' -     at native'));
	t.false(output.includes('undefined'));
});

test('does not emit duplicate key warnings for repeated stack lines', t => {
	const consoleErrors: string[] = [];
	const originalConsoleError = console.error;

	console.error = (...arguments_: unknown[]) => {
		consoleErrors.push(arguments_.join(' '));
	};

	try {
		renderToString(
			<ErrorOverview error={createErrorWithStack('Error: Oh no\n\n\n')} />,
		);
	} finally {
		console.error = originalConsoleError;
	}

	t.false(
		consoleErrors.some(error =>
			error.includes('Encountered two children with the same key'),
		),
	);
});
