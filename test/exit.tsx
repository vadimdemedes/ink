import {serial as test} from 'ava';
import {spawn} from 'node-pty';
import run from './helpers/run';

test('exit normally without unmount() or exit()', async t => {
	const output = await run('exit-normally');
	t.true(output.includes('exited'));
});

test('exit on unmount()', async t => {
	const output = await run('exit-on-unmount');
	t.true(output.includes('exited'));
});

test('exit when app finishes execution', async t => {
	const ps = run('exit-on-finish');
	await t.notThrowsAsync(ps);
});

test('exit on exit()', async t => {
	const output = await run('exit-on-exit');
	t.true(output.includes('exited'));
});

test('exit on exit() with error', async t => {
	const output = await run('exit-on-exit-with-error');
	t.true(output.includes('errored'));
});

test('exit on exit() with raw mode', async t => {
	const output = await run('exit-raw-on-exit');
	t.true(output.includes('exited'));
});

test('exit on exit() with raw mode with error', async t => {
	const output = await run('exit-raw-on-exit-with-error');
	t.true(output.includes('errored'));
});

test('exit on unmount() with raw mode', async t => {
	const output = await run('exit-raw-on-unmount');
	t.true(output.includes('exited'));
});

test('exit with thrown error', async t => {
	const output = await run('exit-with-thrown-error');
	t.true(output.includes('errored'));
});

test.cb('don\'t exit while raw mode is active', t => {
	const term = spawn('../node_modules/.bin/ts-node', ['./fixtures/exit-double-raw-mode.tsx'], {
		name: 'xterm-color',
		cols: 100,
		cwd: __dirname,
		env: process.env
	});

	let output = '';

	term.on('data', data => {
		output += data;
	});

	let isExited = false;

	term.on('exit', code => {
		isExited = true;

		if (code === 0) {
			t.true(output.includes('exited'));
			t.pass();
			t.end();
			return;
		}

		t.fail();
		t.end();
	});

	setTimeout(() => {
		t.false(isExited);
		term.write('q');
	}, 2000);

	setTimeout(() => {
		term.kill();
		t.fail();
		t.end();
	}, 5000);
});
