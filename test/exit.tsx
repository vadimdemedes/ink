import process from 'node:process';
import * as path from 'node:path';
import url from 'node:url';
import {createRequire} from 'node:module';
import test, {type TestContext} from 'node:test';
import stripAnsi from 'strip-ansi';
import {run} from './helpers/run.js';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

test('exit normally without unmount() or exit()', async (t: TestContext) => {
	const output = await run('exit-normally');
	t.assert.ok(output.includes('exited'));
});

test('exit on unmount()', async (t: TestContext) => {
	const output = await run('exit-on-unmount');
	t.assert.ok(output.includes('exited'));
});

// eslint-disable-next-line node-test/require-assertion -- Passes when the process exits without an error.
test('exit when app finishes execution', async () => {
	await run('exit-on-finish');
});

test('exit on exit()', async (t: TestContext) => {
	const output = await run('exit-on-exit');
	t.assert.ok(output.includes('exited'));
});

test('exit on exit() with error', async (t: TestContext) => {
	const output = await run('exit-on-exit-with-error');
	t.assert.ok(output.includes('errored'));
});

test('exit on exit() with error with value property', async (t: TestContext) => {
	const output = await run('exit-on-exit-with-error-value-property');
	t.assert.ok(output.includes('errored'));
});

test('exit on exit() with result value', async (t: TestContext) => {
	const output = await run('exit-on-exit-with-result');
	t.assert.ok(output.includes('result:hello from ink'));
});

test('exit on exit() with object result', async (t: TestContext) => {
	const output = await run('exit-on-exit-with-value-object');
	t.assert.ok(output.includes('result:hello from ink object'));
});

test('exit on exit() with raw mode', async (t: TestContext) => {
	const output = await run('exit-raw-on-exit');
	t.assert.ok(output.includes('exited'));
});

test('exit on exit() with raw mode with error', async (t: TestContext) => {
	const output = await run('exit-raw-on-exit-with-error');
	t.assert.ok(output.includes('errored'));
});

test('exit on unmount() with raw mode', async (t: TestContext) => {
	const output = await run('exit-raw-on-unmount');
	t.assert.ok(output.includes('exited'));
});

test('exit with thrown error', async (t: TestContext) => {
	const output = await run('exit-with-thrown-error');
	t.assert.ok(output.includes('errored'));
});

test('don’t exit while raw mode is active', async (t: TestContext) => {
	let isExitedBeforeQuit = false;

	const exitOutput = await new Promise<string>((resolve, reject) => {
		const env: Record<string, string> = {
			...process.env,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			NODE_NO_WARNINGS: '1',
		};

		const term = spawn(
			process.execPath,
			[
				'--import=tsx',
				path.join(__dirname, './fixtures/exit-double-raw-mode.tsx'),
			],
			{
				name: 'xterm-color',
				cols: 100,
				cwd: __dirname,
				env,
			},
		);

		let output = '';

		term.onData(data => {
			if (data === 's') {
				setTimeout(() => {
					isExitedBeforeQuit = isExited;
					term.write('q');
				}, 500);

				setTimeout(() => {
					term.kill();
					reject(new Error('Test timed out - process did not exit in time'));
				}, 2000);
			} else {
				output += data;
			}
		});

		let isExited = false;

		term.onExit(({exitCode}) => {
			isExited = true;

			if (exitCode === 0) {
				resolve(output);
				return;
			}

			reject(new Error(`Process exited with code ${exitCode}`));
		});
	});

	t.assert.strictEqual(isExitedBeforeQuit, false);
	t.assert.ok(exitOutput.includes('exited'));
});

test('exit when DEV is set', async (t: TestContext) => {
	const output = await run('exit-normally', {
		env: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			DEV: 'true',
		},
	});
	// Warning output depends on whether a local React DevTools server is running.
	t.assert.ok(output.includes('exited'));
});

test('exit on exit() with error and static output', async (t: TestContext) => {
	const output = await run('exit-with-static');
	// Error is propagated, not swallowed
	t.assert.ok(output.includes('errored'));
	// Static items rendered
	t.assert.ok(output.includes('A'));
	t.assert.ok(output.includes('B'));
	t.assert.ok(output.includes('C'));
	// Static items NOT duplicated (the bug from #397)
	const cleaned = stripAnsi(output);
	t.assert.strictEqual(cleaned.split('A').length - 1, 1);
});
