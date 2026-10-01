import test, {type TestContext} from 'node:test';
import React from 'react';
import stripAnsi from 'strip-ansi';
import {renderToString} from '../src/index.js';
import ErrorOverview from '../src/components/ErrorOverview.js';

const createErrorWithStack = (stack: string) => {
	const error = new Error('Oh no');
	// eslint-disable-next-line unicorn/no-error-property-assignment -- The test needs a custom stack trace.
	error.stack = stack;

	return error;
};

test('renders source excerpts for file URLs containing spaces', (t: TestContext) => {
	const sourceUrl = new URL('fixtures/error source.txt', import.meta.url);
	const error = createErrorWithStack(
		`Error: Oh no\n    at ${sourceUrl.href}:1:1`,
	);
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.assert.ok(output.includes("throw new Error('Source excerpt marker');"));
	t.assert.ok(output.includes('error source.txt:1:1'));
});

test('renders the original error when its source path cannot be read', (t: TestContext) => {
	const sourceUrl = new URL('fixtures/', import.meta.url);
	const error = createErrorWithStack(
		`Error: Oh no\n    at ${sourceUrl.href}:1:1`,
	);
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.assert.ok(output.includes('Oh no'));
	t.assert.ok(output.includes('fixtures:1:1'));
});

test('renders the original error when its source file is missing', (t: TestContext) => {
	const error = createErrorWithStack(
		'Error: Oh no\n    at missing-source-file.js:1:1',
	);
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.assert.ok(output.includes('Oh no'));
	t.assert.ok(output.includes('missing-source-file.js:1:1'));
});

test('multiline error messages are not treated as stack frames', (t: TestContext) => {
	const sourceUrl = new URL('fixtures/error source.txt', import.meta.url);
	const error = new Error('Validation failed\nRequired field is missing');
	// eslint-disable-next-line unicorn/no-error-property-assignment -- The test needs a custom stack trace.
	error.stack = `Error: ${error.message}\n    at ${sourceUrl.href}:1:1`;
	const output = stripAnsi(renderToString(<ErrorOverview error={error} />));

	t.assert.ok(output.includes("throw new Error('Source excerpt marker');"));
	t.assert.ok(output.includes('Validation failed'));
	t.assert.strictEqual(output.split('Required field is missing').length, 2);
});

test('renders native stack frames as raw lines', (t: TestContext) => {
	const output = stripAnsi(
		renderToString(
			<ErrorOverview
				error={createErrorWithStack('Error: Oh no\n    at native')}
			/>,
		),
	);

	t.assert.ok(output.includes(' -     at native'));
	t.assert.strictEqual(output.includes('undefined'), false);
});

test('renders named native stack frames as raw lines', (t: TestContext) => {
	const output = stripAnsi(
		renderToString(
			<ErrorOverview
				error={createErrorWithStack('Error: Oh no\n    at foo (native)')}
			/>,
		),
	);

	t.assert.ok(output.includes(' -     at foo (native)'));
	t.assert.strictEqual(output.includes('foo (::)'), false);
	t.assert.strictEqual(output.includes('undefined'), false);
});

test('does not emit duplicate key warnings for repeated stack lines', (t: TestContext) => {
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

	t.assert.strictEqual(
		consoleErrors.some(error =>
			error.includes('Encountered two children with the same key'),
		),
		false,
	);
});
