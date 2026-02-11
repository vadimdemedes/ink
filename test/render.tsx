import process from 'node:process';
import {Writable} from 'node:stream';
import url from 'node:url';
import * as path from 'node:path';
import {createRequire} from 'node:module';
import FakeTimers from '@sinonjs/fake-timers';
import {stub} from 'sinon';
import test, {type ExecutionContext} from 'ava';
import React, {type ReactNode, useEffect, useState} from 'react';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import boxen from 'boxen';
import delay from 'delay';
import {render, Box, Text, useCursor, useInput} from '../src/index.js';
import {type RenderMetrics} from '../src/ink.js';
import {bsu, esu} from '../src/write-synchronized.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
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
		// Strip Synchronized Update Mode sequences (bsu/esu) so tests
		// only see the actual content, not the transport wrapper.
		result.output += data
			.replaceAll('\u001B[?2026h', '')
			.replaceAll('\u001B[?2026l', '');
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

	// The final frame is between the last eraseLines sequence and cursorShow
	// Split on cursorShow to isolate the final rendered content before the cursor is shown
	const beforeCursorShow = ps.output.split(ansiEscapes.cursorShow)[0];
	if (!beforeCursorShow) {
		t.fail('beforeCursorShow is undefined');
		return;
	}

	// Find the last occurrence of an eraseLines sequence
	// eraseLines(1) is the minimal erase pattern used by Ink
	const eraseLinesPattern = ansiEscapes.eraseLines(1);
	const lastEraseIndex = beforeCursorShow.lastIndexOf(eraseLinesPattern);

	const lastFrame =
		lastEraseIndex === -1
			? beforeCursorShow
			: beforeCursorShow.slice(lastEraseIndex + eraseLinesPattern.length);

	const lastFrameContent = stripAnsi(lastFrame);

	for (const letter of ['A', 'B', 'C']) {
		t.false(lastFrameContent.includes(letter));
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

test.serial(
	'fullscreen mode should not add extra newline at the bottom',
	async t => {
		const ps = term('fullscreen-no-extra-newline', ['5']);
		await ps.waitForExit();

		t.true(ps.output.includes('Bottom line'));

		const lastFrame = ps.output.split(ansiEscapes.clearTerminal).at(-1) ?? '';

		// Check that the bottom line is at the end without extra newlines
		// In a 5-line terminal:
		// Line 1: Fullscreen: top
		// Lines 2-4: empty (from flexGrow)
		// Line 5: Bottom line (should be usable)
		const lines = lastFrame.split('\n');

		t.is(lines.length, 5, 'Should have exactly 5 lines for 5-row terminal');

		t.true(
			lines[4]?.includes('Bottom line') ?? false,
			'Bottom line should be on line 5',
		);
	},
);

test.serial(
	'#442: full terminal-size box should not add an extra scroll line',
	async t => {
		const rows = 5;
		const ps = term('issue-442-full-height', [String(rows)]);
		await ps.waitForExit();

		const lastFrame = ps.output.split(ansiEscapes.clearTerminal).at(-1) ?? '';
		const lastFrameContent = stripAnsi(lastFrame);
		const lines = lastFrameContent.split('\n');

		t.false(
			lastFrameContent.endsWith('\n'),
			'Should not end with a trailing newline in fullscreen mode',
		);
		t.is(
			lines.length,
			rows,
			'Should render exactly terminal row count without an extra line',
		);
		t.true(lines.at(-1)?.includes('#442 bottom') ?? false);
	},
);

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

function ThrottleCursorTestComponent({text}: {readonly text: string}) {
	const {setCursorPosition} = useCursor();
	setCursorPosition({x: 0, y: 0});
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

test.serial('outputs renderTime when onRender is passed', async t => {
	const renderTimes: number[] = [];
	const funcObj = {
		onRender(metrics: RenderMetrics) {
			const {renderTime} = metrics;
			renderTimes.push(renderTime);
		},
	};

	const onRenderStub = stub(funcObj, 'onRender').callThrough();

	function Test({children}: {readonly children?: ReactNode}) {
		const [text, setText] = useState('Test');

		useInput(input => {
			setText(input);
		});

		return (
			<Box borderStyle="round">
				<Text>{text}</Text>
				{children}
			</Box>
		);
	}

	const stdin = createStdin();
	const {unmount, rerender} = render(<Test />, {
		onRender: onRenderStub,
		stdin,
	});

	// Initial render
	t.is(onRenderStub.callCount, 1);
	t.true(renderTimes[0] >= 0);

	// Manual rerender
	onRenderStub.resetHistory();
	rerender(
		<Test>
			<Text>Updated</Text>
		</Test>,
	);
	await delay(100);
	t.is(onRenderStub.callCount, 1);
	t.true(renderTimes[1] >= 0);

	// Internal state update via useInput
	onRenderStub.resetHistory();
	emitReadable(stdin, 'a');
	await delay(100);
	t.is(onRenderStub.callCount, 1);
	t.true(renderTimes[2] >= 0);

	// Verify all renders were tracked
	t.is(renderTimes.length, 3);

	unmount();
});

test.serial('no throttled renders after unmount', t => {
	const clock = FakeTimers.install();
	try {
		const stdout = createStdout();

		const {unmount, rerender} = render(<ThrottleTestComponent text="Foo" />, {
			stdout,
		});

		t.is((stdout.write as any).callCount, 1);

		rerender(<ThrottleTestComponent text="Bar" />);
		rerender(<ThrottleTestComponent text="Baz" />);
		unmount();

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const callCountAfterUnmount = (stdout.write as any).callCount;

		// Regression test for https://github.com/vadimdemedes/ink/issues/692
		clock.tick(1000);
		t.is((stdout.write as any).callCount, callCountAfterUnmount);
	} finally {
		clock.uninstall();
	}
});

test.serial('unmount forces pending throttled render', t => {
	const clock = FakeTimers.install();
	try {
		const stdout = createStdout();

		const {unmount, rerender} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1, // 1 Hz => ~1000 ms throttle window
		});

		// Initial render (leading call)
		t.is((stdout.write as any).callCount, 1);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'Hello\n',
		);

		// Trigger another render inside the throttle window
		rerender(<ThrottleTestComponent text="Final" />);
		// Not rendered yet due to throttling
		t.is((stdout.write as any).callCount, 1);

		// Unmount should flush the pending render so the final frame is visible
		unmount();

		// The final frame should have been rendered
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		const allCalls: string[] = (stdout.write as any).args.map(
			(args: string[]) => stripAnsi(args[0]!),
		);
		t.true(allCalls.some((call: string) => call.includes('Final')));
	} finally {
		clock.uninstall();
	}
});

test.serial('waitUntilExit resolves after stdout write callback', async t => {
	let writeCallbackFired = false;

	const stdout = new Writable({
		write(_chunk, _encoding, callback) {
			setTimeout(() => {
				writeCallbackFired = true;
				callback();
			}, 150);
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {stdout});
	const exitPromise = waitUntilExit();

	unmount();
	await exitPromise;

	t.true(writeCallbackFired);
});

const createTtyStdout = (columns?: number) => {
	const stdout = createStdout(columns);
	(stdout as any).isTTY = true;
	return stdout;
};

const withFakeClock = (
	run: (clock: ReturnType<typeof FakeTimers.install>) => void,
) => {
	const clock = FakeTimers.install();
	try {
		run(clock);
	} finally {
		clock.uninstall();
	}
};

const captureWrites = (stdout: NodeJS.WriteStream): string[] => {
	const writes: string[] = [];
	const originalWrite = stdout.write;
	(stdout as any).write = (...args: any[]) => {
		writes.push(args[0] as string);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return (originalWrite as any)(...args);
	};

	return writes;
};

const assertNoBsuEsuForUnchangedTrailingRerender = (
	t: ExecutionContext,
	element: React.ReactElement,
) => {
	withFakeClock(clock => {
		const stdout = createTtyStdout();
		const writes = captureWrites(stdout);
		const {unmount, rerender} = render(element, {stdout, maxFps: 1});
		try {
			t.true(writes.includes(bsu), 'initial render should include bsu');

			writes.length = 0;
			rerender(element);
			clock.tick(1000);

			t.false(writes.includes(bsu), 'unchanged rerender should not emit bsu');
			t.false(writes.includes(esu), 'unchanged rerender should not emit esu');
		} finally {
			unmount();
		}
	});
};

test.serial('no bsu/esu when output is unchanged', t => {
	assertNoBsuEsuForUnchangedTrailingRerender(
		t,
		<ThrottleTestComponent text="Hello" />,
	);
});

test.serial('no bsu/esu when output and cursor are unchanged', t => {
	assertNoBsuEsuForUnchangedTrailingRerender(
		t,
		<ThrottleCursorTestComponent text="Hello" />,
	);
});

test.serial('bsu/esu wraps throttledLog trailing call', t => {
	withFakeClock(clock => {
		const stdout = createTtyStdout();
		const writes = captureWrites(stdout);
		const {unmount, rerender} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1,
		});
		try {
			// Leading call writes: bsu, content, esu
			const leadingWrites = new Set(writes);
			t.true(leadingWrites.has(bsu), 'leading call should include bsu');
			t.true(leadingWrites.has(esu), 'leading call should include esu');

			// Trigger a rerender inside the throttle window (will be deferred as trailing)
			writes.length = 0;
			rerender(<ThrottleTestComponent text="World" />);

			// No immediate write yet (throttled)
			const midWrites = [...writes];
			t.false(
				midWrites.some(w => w.includes('World')),
				'trailing call should not write immediately',
			);

			// Advance past throttle window to trigger trailing call
			writes.length = 0;
			clock.tick(1000);

			// Trailing call should also be wrapped with bsu/esu
			t.true(writes.includes(bsu), 'trailing call should include bsu');
			t.true(writes.includes(esu), 'trailing call should include esu');

			// Verify bsu comes before content and esu comes after
			const bsuIdx = writes.indexOf(bsu);
			const esuIdx = writes.indexOf(esu);
			t.true(bsuIdx < esuIdx, 'bsu should come before esu');
		} finally {
			unmount();
		}
	});
});
