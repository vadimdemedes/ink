import test from 'ava';
import pty from 'pty.js'; // eslint-disable-line ava/no-import-test-files

const run = fixture => {
	return new Promise((resolve, reject) => {
		const term = pty.spawn('node', ['./fixtures/run', `./${fixture}`], {
			name: 'xterm-color',
			cols: 100,
			cwd: __dirname,
			env: process.env
		});

		let output = '';

		term.on('data', data => {
			output += data;
		});

		term.on('exit', code => {
			if (code === 0) {
				resolve(output);
				return;
			}

			reject(new Error('Process exited with a non-zero code'));
		});
	});
};

test('exit normally without unmount() or exit()', async t => {
	const ps = run('exit-normally');
	await t.notThrowsAsync(ps);
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

test('exit on exit() with raw mode', async t => {
	const output = await run('exit-raw-on-exit');
	t.true(output.includes('exited'));
});

test('exit on unmount() with raw mode', async t => {
	const output = await run('exit-raw-on-unmount');
	t.true(output.includes('exited'));
});
