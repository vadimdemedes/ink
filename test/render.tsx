delete process.env.CI;
import React from 'react';
import {serial as test} from 'ava';
import {spawn} from 'node-pty';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import boxen from 'boxen';
import delay from 'delay';
import {render, Box, Text} from '../src';
import createStdout from './helpers/create-stdout';

const term = (fixture: string, args: string[] = []) => {
	let resolve: (value?: unknown) => void;
	let reject: (error: Error) => void;

	// eslint-disable-next-line promise/param-names
	const exitPromise = new Promise((resolve2, reject2) => {
		resolve = resolve2;
		reject = reject2;
	});

	const ps = spawn('ts-node', [`./fixtures/${fixture}.tsx`, ...args], {
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

	['A', 'B', 'C'].forEach(letter => {
		t.false(secondFrame.includes(letter));
	});
});

test('intercept console methods and display result above output', async t => {
	const ps = term('console');
	await ps.waitForExit();

	const frames = ps.output.split(ansiEscapes.eraseLines(2)).map(stripAnsi);

	t.deepEqual(frames, [
		'Hello World\r\n',
		'First log\r\nHello World\r\nSecond log\r\n'
	]);
});

test('rerender on resize', async t => {
	const stdout = createStdout(10);

	const Test = () => (
		<Box borderStyle="round">
			<Text>Test</Text>
		</Box>
	);

	const {unmount} = render(<Test />, {stdout});

	t.is(
		stripAnsi(stdout.write.firstCall.args[0]),
		boxen('Test'.padEnd(8), {borderStyle: 'round'}) + '\n'
	);

	t.is(stdout.listeners('resize').length, 1);

	stdout.columns = 8;
	stdout.emit('resize');
	await delay(100);

	t.is(
		stripAnsi(stdout.write.lastCall.args[0]),
		boxen('Test'.padEnd(6), {borderStyle: 'round'}) + '\n'
	);

	unmount();
	t.is(stdout.listeners('resize').length, 0);
});
