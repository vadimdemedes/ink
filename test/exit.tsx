import process from 'node:process';
import * as path from 'node:path';
import url from 'node:url';
import {createRequire} from 'node:module';
import test from 'ava';
import {run} from './helpers/run.js';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

test.serial('exit normally without unmount() or exit()', async t => {
	const output = await run('exit-normally');
	t.true(output.includes('exited'));
});

test.serial('exit on unmount()', async t => {
	const output = await run('exit-on-unmount');
	t.true(output.includes('exited'));
});

test.serial('exit when app finishes execution', async t => {
	const ps = run('exit-on-finish');
	await t.notThrowsAsync(ps);
});

test.serial('exit on exit()', async t => {
	const output = await run('exit-on-exit');
	t.true(output.includes('exited'));
});

test.serial('exit on exit() with error', async t => {
	const output = await run('exit-on-exit-with-error');
	t.true(output.includes('errored'));
});

test.serial('exit on exit() with raw mode', async t => {
	const output = await run('exit-raw-on-exit');
	t.true(output.includes('exited'));
});

test.serial('exit on exit() with raw mode with error', async t => {
	const output = await run('exit-raw-on-exit-with-error');
	t.true(output.includes('errored'));
});

test.serial('exit on unmount() with raw mode', async t => {
	const output = await run('exit-raw-on-unmount');
	t.true(output.includes('exited'));
});

test.serial('exit with thrown error', async t => {
	const output = await run('exit-with-thrown-error');
	t.true(output.includes('errored'));
});

test.serial('don’t exit while raw mode is active', async t => {
	await new Promise<void>((resolve, _reject) => {
		const env: Record<string, string> = {
			...process.env,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			NODE_NO_WARNINGS: '1',
		};

		const term = spawn(
			'node',
			[
				'--loader=ts-node/esm',
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
					t.false(isExited);
					term.write('q');
				}, 2000);

				setTimeout(() => {
					term.kill();
					t.fail();
					resolve();
				}, 5000);
			} else {
				output += data;
			}
		});

		let isExited = false;

		term.onExit(({exitCode}) => {
			isExited = true;

			if (exitCode === 0) {
				t.true(output.includes('exited'));
				t.pass();
				resolve();
				return;
			}

			t.fail();
			resolve();
		});
	});
});
