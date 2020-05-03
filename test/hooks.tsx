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
		write: (input: string) => ps.write(input),
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

test('useInput - ignore input if not active', async t => {
	const ps = term('use-input-multiple');
	ps.write('x');
	await ps.waitForExit();
	t.false(ps.output.includes('xx'));
	t.true(ps.output.includes('x'));
	t.true(ps.output.includes('exited'));
});

test('useStdout - write to output', async t => {
	const ps = term('use-stdout');
	await ps.waitForExit();

	const lines = stripAnsi(ps.output).split('\r\n').slice(1, -1);
	t.deepEqual(lines, ['Hello from Ink to stdout', 'Hello World', 'exited']);
});

test.todo('useStderr - write to stderr');
