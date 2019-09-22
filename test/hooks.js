import {serial as test} from 'ava';
import {spawn} from 'node-pty';

const term = (fixture, args = []) => {
	let resolve;
	let reject;

	// eslint-disable-next-line promise/param-names
	const exitPromise = new Promise((resolve2, reject2) => {
		resolve = resolve2;
		reject = reject2;
	});

	const ps = spawn('node', ['./fixtures/run', `./${fixture}`, ...args], {
		name: 'xterm-color',
		cols: 100,
		cwd: __dirname,
		env: process.env
	});

	const result = {
		write: input => ps.write(input),
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

test('handle lowercase character', async t => {
	const ps = term('use-input', ['lowercase']);
	ps.write('q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle uppercase character', async t => {
	const ps = term('use-input', ['uppercase']);
	ps.write('Q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle escape', async t => {
	const ps = term('use-input', ['escape']);
	ps.write('\u001B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle ctrl', async t => {
	const ps = term('use-input', ['ctrl']);
	ps.write('\u0006');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle meta', async t => {
	const ps = term('use-input', ['meta']);
	ps.write('\u001Bm');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle up arrow', async t => {
	const ps = term('use-input', ['upArrow']);
	ps.write('\u001B[A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle down arrow', async t => {
	const ps = term('use-input', ['downArrow']);
	ps.write('\u001B[B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle left arrow', async t => {
	const ps = term('use-input', ['leftArrow']);
	ps.write('\u001B[D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test('handle right arrow', async t => {
	const ps = term('use-input', ['rightArrow']);
	ps.write('\u001B[C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});
