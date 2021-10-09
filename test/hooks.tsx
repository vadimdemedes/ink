import {serial as test} from 'ava';
import {spawn} from 'node-pty';
import stripAnsi from 'strip-ansi';

const term = (fixture: string, args: string[] = []) => {
	let resolve: (value?: any) => void;
	let reject: (error?: Error) => void;

	// eslint-disable-next-line promise/param-names
	const exitPromise = new Promise((resolve2, reject2) => {
		resolve = resolve2;
		reject = reject2;
	});

	const env = {...process.env};
	delete env.CI;

	const ps = spawn('ts-node', [`./fixtures/${fixture}.tsx`, ...args], {
		name: 'xterm-color',
		cols: 100,
		cwd: __dirname,
		env
	});

	const result = {
		write: (input: string) => {
			// Give TS and Ink time to start up and render UI
			// TODO: Send a signal from the Ink process when it's ready to accept input instead
			setTimeout(() => {
				ps.write(input);
			}, 3000);
		},
		output: '',
		waitForExit: () => exitPromise
	};

	ps.on('data', data => {
		result.output += data;
	});

	ps.on('exit', code => {
		if (code === 0) {
			resolve();
			return;
		}

		reject(new Error(`Process exited with non-zero exit code: ${code}`));
	});

	return result;
};

test('useInput - handle lowercase character', async t => {
	const ps = term('use-input', ['lowercase']);
	ps.write('q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle uppercase character', async t => {
	const ps = term('use-input', ['uppercase']);
	ps.write('Q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle escape', async t => {
	const ps = term('use-input', ['escape']);
	ps.write('\u001B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle ctrl', async t => {
	const ps = term('use-input', ['ctrl']);
	ps.write('\u0006');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle meta', async t => {
	const ps = term('use-input', ['meta']);
	ps.write('\u001Bm');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle up arrow', async t => {
	const ps = term('use-input', ['upArrow']);
	ps.write('\u001B[A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle down arrow', async t => {
	const ps = term('use-input', ['downArrow']);
	ps.write('\u001B[B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle left arrow', async t => {
	const ps = term('use-input', ['leftArrow']);
	ps.write('\u001B[D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle right arrow', async t => {
	const ps = term('use-input', ['rightArrow']);
	ps.write('\u001B[C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle page down', async t => {
	const ps = term('use-input', ['pageDown']);
	ps.write('\u001B[6~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle page up', async t => {
	const ps = term('use-input', ['pageUp']);
	ps.write('\u001B[5~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle Tab', async t => {
	const ps = term('use-input', ['tab']);
	ps.write('\t');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle Shift+Tab', async t => {
	const ps = term('use-input', ['shiftTab']);
	ps.write('\u001B[Z');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle backspace', async t => {
	const ps = term('use-input', ['backspace']);
	ps.write('\u0008');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle delete', async t => {
	const ps = term('use-input', ['delete']);
	ps.write('\u007F');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - handle remove (delete)', async t => {
	const ps = term('use-input', ['remove']);
	ps.write('\u001B[3~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('useInput - ignore input if not active', async t => {
	const ps = term('use-input-multiple');
	ps.write('x');
	await ps.waitForExit();
	t.false(ps.output.includes('xx'));
	t.true(ps.output.includes('x'));
	t.true(ps.output.includes('exited'));
});

// For some reason this test is flaky, so we have to resort to using `t.try` to run it multiple times
test('useInput - handle Ctrl+C when `exitOnCtrlC` is `false`', async t => {
	const run = async tt => {
		const ps = term('use-input-ctrl-c');
		ps.write('\u0003');
		await ps.waitForExit();
		tt.true(ps.output.includes('exited'));
	};

	const firstTry = await t.try(run);

	if (firstTry.passed) {
		firstTry.commit();
		return;
	}

	firstTry.discard();

	const secondTry = await t.try(run);

	if (secondTry.passed) {
		secondTry.commit();
		return;
	}

	secondTry.discard();

	const thirdTry = await t.try(run);
	thirdTry.commit();
});

test('useStdout - write to stdout', async t => {
	const ps = term('use-stdout');
	await ps.waitForExit();

	const lines = stripAnsi(ps.output).split('\r\n').slice(1, -1);
	t.deepEqual(lines, ['Hello from Ink to stdout', 'Hello World', 'exited']);
});

// `node-pty` doesn't support streaming stderr output, so I need to figure out
// how to test useStderr() hook. child_process.spawn() can't be used, because
// Ink fails with "raw mode unsupported" error.
test.todo('useStderr - write to stderr');
