import process from 'node:process';
import test, {before, after, type TestContext} from 'node:test';
import React, {useEffect} from 'react';
import patchConsole from 'patch-console';
import stripAnsi from 'strip-ansi';
import {render, useStdin, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

let restore = () => {};

before(() => {
	restore = patchConsole(() => {});
});

after(() => {
	restore();
});

test('catch and display error', (t: TestContext) => {
	const stdout = createStdout();

	const Test = () => {
		throw new Error('Oh no');
	};

	render(<Test />, {stdout});

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const writes: string[] = (stdout.write as any)
		.getCalls()
		.map((c: any) => c.args[0] as string)
		.filter(
			(w: string) =>
				w.length > 0 &&
				!w.startsWith('\u{1B}[?25') &&
				!w.startsWith('\u{1B}[?2026'),
		);
	const lastContentWrite = writes.at(-1)!;

	t.assert.deepStrictEqual(
		stripAnsi(lastContentWrite).split('\n').slice(0, 14),
		[
			'',
			'  ERROR  Oh no',
			'',
			' test/errors.tsx:24:9',
			'',
			' 21:   const stdout = createStdout();',
			' 22:',
			' 23:   const Test = () => {',
			" 24:     throw new Error('Oh no');",
			' 25:   };',
			' 26:',
			' 27:   render(<Test />, {stdout});',
			'',
			' - Test (test/errors.tsx:24:9)',
		],
	);
});

test('does not emit unhandledRejection when render exits with an error and waitUntilExit is unused', async (t: TestContext) => {
	const stdout = createStdout();
	const unhandledRejectionReasons: unknown[] = [];
	const onUnhandledRejection = (reason: unknown) => {
		unhandledRejectionReasons.push(reason);
	};

	process.on('unhandledRejection', onUnhandledRejection);

	try {
		const Test = () => {
			throw new Error('Oh no');
		};

		render(<Test />, {stdout});

		await new Promise<void>(resolve => {
			setImmediate(resolve);
		});
		await new Promise<void>(resolve => {
			setImmediate(resolve);
		});

		t.assert.strictEqual(unhandledRejectionReasons.length, 0);
	} finally {
		process.off('unhandledRejection', onUnhandledRejection);
	}
});

test('ErrorBoundary catches and displays nested component errors', (t: TestContext) => {
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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const writes: string[] = (stdout.write as any)
		.getCalls()
		.map((c: any) => c.args[0] as string)
		.filter(
			(w: string) =>
				w.length > 0 &&
				!w.startsWith('\u{1B}[?25') &&
				!w.startsWith('\u{1B}[?2026'),
		);
	const lastContentWrite = writes.at(-1)!;
	const output = stripAnsi(lastContentWrite);
	t.assert.ok(output.includes('ERROR'), 'Error label should be displayed');
	t.assert.ok(
		output.includes('Nested component error'),
		'Error message should be shown',
	);
});

test('clean up raw mode when error is thrown', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	function Test() {
		const {setRawMode} = useStdin();

		useEffect(() => {
			setRawMode(true);
			// Throw after enabling raw mode
			throw new Error('Error after raw mode enabled');
		}, [setRawMode]);

		return <Text>Test</Text>;
	}

	const app = render(<Test />, {stdout, stdin});

	await t.assert.rejects(app.waitUntilExit(), Error);

	// Raw mode was turned off again after the error, and only once. This doesn't tell apart which teardown step disabled it (the error exit or the unmount cleanup).
	t.assert.deepStrictEqual(
		(stdin.setRawMode as unknown as {args: unknown[][]}).args,
		[[true], [false]],
	);
});

test(
	'display thrown strings and reject waitUntilExit with the original message',
	{timeout: 5000},
	async (t: TestContext) => {
		const stdout = createStdout();

		function Test(): React.JSX.Element {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw 'Unable to load configuration';
		}

		const app = render(<Test />, {stdout});
		t.after(() => {
			app.unmount();
		});
		await t.assert.rejects(app.waitUntilExit(), {
			message: 'Unable to load configuration',
		});

		const output = stripAnsi(stdout.getWrites().join(''));
		t.assert.ok(output.includes('ERROR'));
		t.assert.ok(output.includes('Unable to load configuration'));
	},
);

test(
	'display thrown undefined and reject waitUntilExit',
	{timeout: 5000},
	async (t: TestContext) => {
		const stdout = createStdout();

		function Test(): React.JSX.Element {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw undefined;
		}

		const app = render(<Test />, {stdout});
		t.after(() => {
			app.unmount();
		});
		await t.assert.rejects(app.waitUntilExit(), {message: 'undefined'});

		const output = stripAnsi(stdout.getWrites().join(''));
		t.assert.ok(output.includes('ERROR  undefined'));
	},
);

test('waitUntilExit preserves the original component error', async (t: TestContext) => {
	const stdout = createStdout();
	const error = new Error('Original component error');

	function Test(): React.JSX.Element {
		throw error;
	}

	const app = render(<Test />, {stdout});
	t.after(() => {
		app.unmount();
	});
	await t.assert.rejects(
		app.waitUntilExit(),
		caughtError => caughtError === error,
	);
});

test('waitUntilExit preserves a component error from another realm', async (t: TestContext) => {
	const {default: vm} = await import('node:vm');
	const stdout = createStdout();
	const error = vm.runInNewContext(
		'new Error("Cross-realm component error")',
	) as Error;

	function Test(): React.JSX.Element {
		throw error;
	}

	const app = render(<Test />, {stdout});
	t.after(() => {
		app.unmount();
	});
	await t.assert.rejects(
		app.waitUntilExit(),
		caughtError => caughtError === error,
	);
});
