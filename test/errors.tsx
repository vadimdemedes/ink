import process from 'node:process';
import React, {useEffect} from 'react';
import test from 'ava';
import patchConsole from 'patch-console';
import stripAnsi from 'strip-ansi';
import {render, useStdin, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

let restore = () => {};

test.before(() => {
	restore = patchConsole(() => {});
});

test.after(() => {
	restore();
});

test('catch and display error', t => {
	const stdout = createStdout();

	const Test = () => {
		throw new Error('Oh no');
	};

	render(<Test />, {stdout});

	t.deepEqual(
		stripAnsi((stdout.write as any).lastCall.args[0] as string)
			.split('\n')
			.slice(0, 14),
		[
			'',
			'  ERROR  Oh no',
			'',
			' test/errors.tsx:23:9',
			'',
			' 20:   const stdout = createStdout();',
			' 21:',
			' 22:   const Test = () => {',
			" 23:     throw new Error('Oh no');",
			' 24:   };',
			' 25:',
			' 26:   render(<Test />, {stdout});',
			'',
			' - Test (test/errors.tsx:23:9)',
		],
	);
});

test('ErrorBoundary catches and displays nested component errors', t => {
	const stdout = createStdout();

	const NestedComponent = () => {
		throw new Error('Nested component error');
	};

	function Parent() {
		return (
			<Text>
				Before error
				<NestedComponent />
			</Text>
		);
	}

	render(<Parent />, {stdout});

	const output = stripAnsi((stdout.write as any).lastCall.args[0] as string);
	t.true(output.includes('ERROR'), 'Error label should be displayed');
	t.true(
		output.includes('Nested component error'),
		'Error message should be shown',
	);
});

test('clean up raw mode when error is thrown', async t => {
	const stdout = createStdout();

	// Track setRawMode calls
	const setRawModeCalls: boolean[] = [];
	const originalSetRawMode = process.stdin.setRawMode?.bind(process.stdin);

	// Only run this test if raw mode is supported
	if (!process.stdin.isTTY) {
		t.pass('Skipping test - stdin is not a TTY');
		return;
	}

	process.stdin.setRawMode = (mode: boolean) => {
		setRawModeCalls.push(mode);

		return originalSetRawMode?.(mode) ?? process.stdin;
	};

	function Test() {
		const {setRawMode} = useStdin();

		useEffect(() => {
			setRawMode(true);
			// Throw after enabling raw mode
			throw new Error('Error after raw mode enabled');
		}, [setRawMode]);

		return <Text>Test</Text>;
	}

	const app = render(<Test />, {stdout});

	await t.throwsAsync(app.waitUntilExit());

	// Restore original setRawMode
	if (originalSetRawMode) {
		process.stdin.setRawMode = originalSetRawMode;
	}

	// Verify raw mode was enabled then disabled
	t.true(setRawModeCalls.includes(true), 'Raw mode should have been enabled');
	t.true(
		setRawModeCalls.includes(false),
		'Raw mode should have been disabled on cleanup',
	);
});
