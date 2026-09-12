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

test('renders source excerpts for file URLs containing spaces', t => {
	const sourceUrl = new URL('fixtures/error source.txt', import.meta.url);
	const error = createErrorWithStack(
		`Error: Oh no\n    at ${sourceUrl.href}:1:1`,
	);
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.true(output.includes("throw new Error('Source excerpt marker');"));
	t.true(output.includes('error source.txt:1:1'));
});

test('renders the original error when its source path cannot be read', t => {
	const sourceUrl = new URL('fixtures/', import.meta.url);
	const error = createErrorWithStack(
		`Error: Oh no\n    at ${sourceUrl.href}:1:1`,
	);
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.true(output.includes('Oh no'));
	t.true(output.includes('fixtures:1:1'));
});

test('renders the original error when its source file is missing', t => {
	const error = createErrorWithStack(
		'Error: Oh no\n    at missing-source-file.js:1:1',
	);
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.true(output.includes('Oh no'));
	t.true(output.includes('missing-source-file.js:1:1'));
});

test('multiline error messages are not treated as stack frames', t => {
	const sourceUrl = new URL('fixtures/error source.txt', import.meta.url);
	const error = new Error('Validation failed\nRequired field is missing');
	error.stack = `Error: ${error.message}\n    at ${sourceUrl.href}:1:1`;
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.true(output.includes("throw new Error('Source excerpt marker');"));
	t.true(output.includes('Validation failed'));
	t.is(output.split('Required field is missing').length, 2);
});

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

test('renders named native stack frames as raw lines', t => {
	const output = stripAnsi(
		renderToString(
			<ErrorOverview
				error={createErrorWithStack('Error: Oh no\n    at foo (native)')}
			/>,
		),
	);

	t.true(output.includes(' -     at foo (native)'));
	t.false(output.includes('foo (::)'));
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
