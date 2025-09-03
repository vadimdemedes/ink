import process from 'node:process';
import url from 'node:url';
import * as path from 'node:path';
import {createRequire} from 'node:module';
import FakeTimers from '@sinonjs/fake-timers';
import test from 'ava';
import React from 'react';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import boxen from 'boxen';
import delay from 'delay';
import {render, Box, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const term = (fixture: string, args: string[] = []) => {
	let resolve: (value?: unknown) => void;
	let reject: (error: Error) => void;

	// eslint-disable-next-line promise/param-names
	const exitPromise = new Promise((resolve2, reject2) => {
		resolve = resolve2;
		reject = reject2;
	});

	const env = {
		...process.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_NO_WARNINGS: '1',
	};

	const ps = spawn(
		'node',
		[
			'--loader=ts-node/esm',
			path.join(__dirname, `./fixtures/${fixture}.tsx`),
			...args,
		],
		{
			name: 'xterm-color',
			cols: 100,
			cwd: __dirname,
			env,
		},
	);

	const result = {
		write(input: string) {
			ps.write(input);
		},
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

test.serial('do not erase screen', async t => {
	const ps = term('erase', ['4']);
	await ps.waitForExit();
	t.false(ps.output.includes(ansiEscapes.clearTerminal));

	for (const letter of ['A', 'B', 'C']) {
		t.true(ps.output.includes(letter));
	}
});

test.serial(
	'do not erase screen where <Static> is taller than viewport',
	async t => {
		const ps = term('erase-with-static', ['4']);

		await ps.waitForExit();
		t.false(ps.output.includes(ansiEscapes.clearTerminal));

		for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
			t.true(ps.output.includes(letter));
		}
	},
);

test.serial('erase screen', async t => {
	const ps = term('erase', ['3']);
	await ps.waitForExit();
	t.true(ps.output.includes(ansiEscapes.clearTerminal));

	for (const letter of ['A', 'B', 'C']) {
		t.true(ps.output.includes(letter));
	}
});

test.serial(
	'erase screen where <Static> exists but interactive part is taller than viewport',
	async t => {
		const ps = term('erase', ['3']);
		await ps.waitForExit();
		t.true(ps.output.includes(ansiEscapes.clearTerminal));

		for (const letter of ['A', 'B', 'C']) {
			t.true(ps.output.includes(letter));
		}
	},
);

test.serial('erase screen where state changes', async t => {
	const ps = term('erase-with-state-change', ['4']);
	await ps.waitForExit();

	const secondFrame = ps.output.split(ansiEscapes.eraseLines(3))[1];

	for (const letter of ['A', 'B', 'C']) {
		t.false(secondFrame?.includes(letter));
	}
});

test.serial('erase screen where state changes in small viewport', async t => {
	const ps = term('erase-with-state-change', ['3']);
	await ps.waitForExit();

	const frames = ps.output.split(ansiEscapes.clearTerminal);
	const lastFrame = frames.at(-1);

	for (const letter of ['A', 'B', 'C']) {
		t.false(lastFrame?.includes(letter));
	}
});

test.serial('clear output', async t => {
	const ps = term('clear');
	await ps.waitForExit();

	const secondFrame = ps.output.split(ansiEscapes.eraseLines(4))[1];

	for (const letter of ['A', 'B', 'C']) {
		t.false(secondFrame?.includes(letter));
	}
});

test.serial(
	'intercept console methods and display result above output',
	async t => {
		const ps = term('console');
		await ps.waitForExit();

		const frames = ps.output.split(ansiEscapes.eraseLines(2)).map(line => {
			return stripAnsi(line);
		});

		t.deepEqual(frames, [
			'Hello World\r\n',
			'First log\r\nHello World\r\nSecond log\r\n',
		]);
	},
);

test.serial('rerender on resize', async t => {
	const stdout = createStdout(10);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Test</Text>
			</Box>
		);
	}

	const {unmount} = render(<Test />, {stdout});

	t.is(
		stripAnsi((stdout.write as any).firstCall.args[0] as string),
		boxen('Test'.padEnd(8), {borderStyle: 'round'}) + '\n',
	);

	t.is(stdout.listeners('resize').length, 1);

	stdout.columns = 8;
	stdout.emit('resize');
	await delay(100);

	t.is(
		stripAnsi((stdout.write as any).lastCall.args[0] as string),
		boxen('Test'.padEnd(6), {borderStyle: 'round'}) + '\n',
	);

	unmount();
	t.is(stdout.listeners('resize').length, 0);
});

function ThrottleTestComponent({text}: {readonly text: string}) {
	return <Text>{text}</Text>;
}

test.serial('throttle renders to maxFps', t => {
	const clock = FakeTimers.install(); // Controls timers + Date.now()
	try {
		const stdout = createStdout();

		const {unmount, rerender} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1, // 1 Hz => ~1000 ms window
		});

		// Initial render (leading call)
		t.is((stdout.write as any).callCount, 1);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'Hello\n',
		);

		// Trigger another render inside the throttle window
		rerender(<ThrottleTestComponent text="World" />);
		t.is((stdout.write as any).callCount, 1);

		// Advance 999 ms: still within window, no trailing call yet
		clock.tick(999);
		t.is((stdout.write as any).callCount, 1);

		// Cross the boundary: trailing render fires once
		clock.tick(1);
		t.is((stdout.write as any).callCount, 2);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'World\n',
		);

		unmount();
	} finally {
		clock.uninstall();
	}
});
