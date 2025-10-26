import process from 'node:process';
import url from 'node:url';
import path from 'node:path';
import test from 'ava';
import {spawn} from 'node-pty';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const term = (testName: string) => {
	let resolve: (value?: any) => void;
	let reject: (error?: Error) => void;

	const exitPromise = new Promise((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	const environment: Record<string, string> = {
		...process.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_NO_WARNINGS: '1',
		// eslint-disable-next-line @typescript-eslint/naming-convention
		CI: 'false',
	};

	const ps = spawn(
		'node',
		[
			'--loader=ts-node/esm',
			path.join(__dirname, './multiline-cursor-simple.tsx'),
			testName,
		],
		{
			name: 'xterm-color',
			cols: 100,
			cwd: __dirname,
			env: environment,
		},
	);

	const result = {
		output: '',
		waitForExit: async () => exitPromise,
	};

	ps.onData(data => {
		result.output += data;
	});

	ps.onExit(({exitCode}) => {
		if (exitCode === 0) {
			resolve();
			return;
		}

		reject(new Error(`Process exited with non-zero exit code: ${exitCode}`));
	});

	return result;
};

test.serial('multiline cursor - empty text', async t => {
	const ps = term('empty-text');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=0, col=0'));
});

test.serial('multiline cursor - single line at end', async t => {
	const ps = term('single-line-end');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=0, col=5'));
});

test.serial('multiline cursor - two lines on second line', async t => {
	const ps = term('two-lines-second-line');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=3'));
});

test.serial('multiline cursor - empty line between text', async t => {
	const ps = term('empty-line');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=0'));
});

test.serial('multiline cursor - fullwidth characters', async t => {
	const ps = term('fullwidth-chars');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=0, col=6'));
});

test.serial('multiline cursor - mixed width characters', async t => {
	const ps = term('mixed-width');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=0, col=4'));
});

test.serial('multiline cursor - cursor on newline character', async t => {
	const ps = term('cursor-on-newline');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=0, col=3'));
});

test.serial('multiline cursor - multiple empty lines', async t => {
	const ps = term('multiple-empty-lines');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=0'));
});

test.serial('multiline cursor - line start', async t => {
	const ps = term('line-start');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=0'));
});

test.serial('multiline cursor - text start', async t => {
	const ps = term('text-start');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=0, col=0'));
});

test.serial('multiline cursor - long line with wrap', async t => {
	const ps = term('long-line-wrap');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=10'));
});

test.serial('multiline cursor - fullwidth characters wrap', async t => {
	const ps = term('fullwidth-wrap');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=10'));
});

test.serial('multiline cursor - fullwidth wrap at boundary', async t => {
	const ps = term('fullwidth-wrap-boundary');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=0'));
});

test.serial('multiline cursor - mixed width with wrap', async t => {
	const ps = term('mixed-width-wrap');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=0, col=60'));
});

test.serial('multiline cursor - cursor at wrap point', async t => {
	const ps = term('cursor-at-wrap-point');
	await ps.waitForExit();
	t.true(ps.output.includes('PASS'));
	t.true(ps.output.includes('row=1, col=0'));
});
