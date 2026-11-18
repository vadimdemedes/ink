import process from 'node:process';
import os from 'node:os';
import * as path from 'node:path';
import url from 'node:url';
import {createRequire} from 'node:module';
import test, {type TestContext} from 'node:test';
import ansiEscapes from 'ansi-escapes';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
	test(
		`unmount and restore the terminal on ${signal}`,
		// eslint-disable-next-line node-test/no-skip-test -- Windows terminates the process without delivering the signal.
		{skip: process.platform === 'win32'},
		async (t: TestContext) => {
			const term = spawn(
				process.execPath,
				['--import=tsx', path.join(__dirname, './fixtures/exit-on-signal.tsx')],
				{
					name: 'xterm-color',
					cols: 100,
					cwd: __dirname,
					env: {
						...process.env,
						// eslint-disable-next-line @typescript-eslint/naming-convention
						CI: 'false',
						// eslint-disable-next-line @typescript-eslint/naming-convention
						NODE_NO_WARNINGS: '1',
					},
				},
			);

			let output = '';
			let isSignalSent = false;

			term.onData(data => {
				output += data;

				if (isSignalSent || !output.includes('__READY__')) {
					return;
				}

				isSignalSent = true;
				term.kill(signal);
			});

			const exit = await new Promise<{exitCode: number; signal?: number}>(
				resolve => {
					term.onExit(resolve);
				},
			);

			const outputAfterSignal = output.slice(output.indexOf('__READY__'));
			t.assert.ok(outputAfterSignal.includes('unmounted'));
			t.assert.ok(outputAfterSignal.includes('\u{1B}[?2004l'));
			t.assert.ok(
				outputAfterSignal.includes(ansiEscapes.exitAlternativeScreen),
			);
			// The process must still die from the signal after cleaning up.
			t.assert.strictEqual(exit.signal, os.constants.signals[signal]);
		},
	);
}
