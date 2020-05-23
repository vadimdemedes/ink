import {serial as test} from 'ava';
import {spawn} from 'node-pty';
import ansiEscapes from 'ansi-escapes';

const term = (fixture: string, args: string[] = []) => {
	let resolve: (value?: unknown) => void;
	let reject: (error: Error) => void;

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

test('do not erase screen', async t => {
	const ps = term('erase', ['4']);
	await ps.waitForExit();
	t.false(ps.output.includes(ansiEscapes.clearTerminal));

	['A', 'B', 'C'].forEach(letter => {
		t.true(ps.output.includes(letter));
	});
});

test('do not erase screen where <Static> is taller than viewport', async t => {
	const ps = term('erase-with-static', ['4']);

	await ps.waitForExit();
	t.false(ps.output.includes(ansiEscapes.clearTerminal));

	['A', 'B', 'C', 'D', 'E', 'F'].forEach(letter => {
		t.true(ps.output.includes(letter));
	});
});

test('erase screen', async t => {
	const ps = term('erase', ['3']);
	await ps.waitForExit();
	t.true(ps.output.includes(ansiEscapes.clearTerminal));

	['A', 'B', 'C'].forEach(letter => {
		t.true(ps.output.includes(letter));
	});
});

test('erase screen where <Static> exists but interactive part is taller than viewport', async t => {
	const ps = term('erase', ['3']);
	await ps.waitForExit();
	t.true(ps.output.includes(ansiEscapes.clearTerminal));

	['A', 'B', 'C'].forEach(letter => {
		t.true(ps.output.includes(letter));
	});
});

test('clear output', async t => {
	const ps = term('clear');
	await ps.waitForExit();

	const secondFrame = ps.output.split(ansiEscapes.eraseLines(4))[1];

	[('A', 'B', 'C')].forEach(letter => {
		t.false(secondFrame.includes(letter));
	});
});
