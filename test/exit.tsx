// TODO
import test from 'ava';
test("foo", (t) => {
	t.truthy(true)
})

// import {spawn} from 'node-pty';
// import {run} from './helpers/run.js';
// import * as url from 'url';
// const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// test.serial('exit normally without unmount() or exit()', async t => {
// 	const output = await run('exit-normally');
// 	t.true(output.includes('exited'));
// });

// test.serial('exit on unmount()', async t => {
// 	const output = await run('exit-on-unmount');
// 	t.true(output.includes('exited'));
// });

// test.serial('exit when app finishes execution', async t => {
// 	const ps = run('exit-on-finish');
// 	await t.notThrowsAsync(ps);
// });

// test.serial('exit on exit()', async t => {
// 	const output = await run('exit-on-exit');
// 	t.true(output.includes('exited'));
// });

// test.serial('exit on exit() with error', async t => {
// 	const output = await run('exit-on-exit-with-error');
// 	t.true(output.includes('errored'));
// });

// test.serial('exit on exit() with raw mode', async t => {
// 	const output = await run('exit-raw-on-exit');
// 	t.true(output.includes('exited'));
// });

// test.serial('exit on exit() with raw mode with error', async t => {
// 	const output = await run('exit-raw-on-exit-with-error');
// 	t.true(output.includes('errored'));
// });

// test.serial('exit on unmount() with raw mode', async t => {
// 	const output = await run('exit-raw-on-unmount');
// 	t.true(output.includes('exited'));
// });

// test.serial('exit with thrown error', async t => {
// 	const output = await run('exit-with-thrown-error');
// 	t.true(output.includes('errored'));
// });

// test('don’t exit while raw mode is active', async t => {
// 	await new Promise<void>((resolve, _reject) => {
// 		const term = spawn(
// 			'../node_modules/.bin/ts-node',
// 			['./fixtures/exit-double-raw-mode.tsx'],
// 			{
// 				name: 'xterm-color',
// 				cols: 100,
// 				cwd: __dirname,
// 				env: process.env as {[variable: string]: string}
// 			}
// 		);

// 		let output = '';

// 		term.on('data', data => {
// 			if (data === 's') {
// 				setTimeout(() => {
// 					t.false(isExited);
// 					term.write('q');
// 				}, 2000);

// 				setTimeout(() => {
// 					term.kill();
// 					t.fail();
// 					resolve();
// 				}, 5000);
// 			} else {
// 				output += data;
// 			}
// 		});

// 		let isExited = false;

// 		term.on('exit', code => {
// 			isExited = true;

// 			if (code === 0) {
// 				t.true(output.includes('exited'));
// 				t.pass();
// 				resolve();
// 				return;
// 			}

// 			t.fail();
// 			resolve();
// 		});
// 	})
// });
