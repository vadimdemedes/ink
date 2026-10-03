import test, {type TestContext} from 'node:test';
import React, {Suspense, useEffect, useState} from 'react';
import ansiEscapes from 'ansi-escapes';
import delay from 'delay';
import {
	render,
	Box,
	Text,
	useInput,
	useCursor,
	useStdout,
	useStderr,
} from '../src/index.js';
import {homeAndEraseDown} from '../src/ink.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';
import {act} from './helpers/act.js';

const showCursorEscape = '\u{1B}[?25h';
const hideCursorEscape = '\u{1B}[?25l';

const getWriteCalls = (stream: NodeJS.WriteStream): string[] => {
	const writes: string[] = [];
	for (let i = 0; i < (stream.write as any).callCount; i++) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		writes.push((stream.write as any).getCall(i).args[0] as string);
	}

	return writes;
};

const waitForCondition = async (
	isConditionMet: () => boolean,
): Promise<void> => {
	if (isConditionMet()) {
		return;
	}

	const timeoutMs = 2000;
	const intervalMs = 10;
	const maxAttempts = Math.ceil(timeoutMs / intervalMs);

	await new Promise<void>((resolve, reject) => {
		let attempts = 0;
		const interval = setInterval(() => {
			try {
				if (isConditionMet()) {
					clearInterval(interval);
					resolve();
					return;
				}
			} catch (error) {
				clearInterval(interval);
				reject(
					error instanceof Error ? error : new Error('Condition check threw'),
				);
				return;
			}

			attempts++;
			if (!(attempts >= maxAttempts)) {
				return;
			}

			clearInterval(interval);
			reject(new Error(`Condition was not met in ${timeoutMs}ms`));
		}, intervalMs);
	});
};

function InputApp() {
	const [text, setText] = useState('');
	const {setCursorPosition} = useCursor();

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(previous => previous.slice(0, -1));
			return;
		}

		if (input !== '' && !key.ctrl && !key.meta) {
			setText(previous => previous + input);
		}
	});

	setCursorPosition({x: 2 + text.length, y: 0});

	return (
		<Box>
			<Text>{`> ${text}`}</Text>
		</Box>
	);
}

test('cursor is shown at specified position after render', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<InputApp />, {stdout, stdin});
	await delay(50);

	// With isTTY=true, cli-cursor writes cursor escape sequences as separate
	// stdout.write calls (synchronized output wrappers), so we check the
	// combined output of the first render rather than a single firstCall.
	const firstRenderOutput = getWriteCalls(stdout).join('');
	// Cursor should be shown at x=2 (after "> ")
	t.assert.ok(
		firstRenderOutput.includes(showCursorEscape),
		'cursor should be visible after first render',
	);
	t.assert.ok(
		firstRenderOutput.includes(ansiEscapes.cursorTo(2)),
		'cursor should be at column 2',
	);

	unmount();
});

for (const isIncrementalRendering of [false, true]) {
	test(`memoized cursor survives sibling updates (incremental: ${isIncrementalRendering})`, async (t: TestContext) => {
		const stdout = createStdout();
		let cursorRenderCount = 0;
		const Cursor = React.memo(() => {
			cursorRenderCount++;
			const {setCursorPosition} = useCursor();
			setCursorPosition({x: 2, y: 0});
			return <Text>Input</Text>;
		});
		function Test({status}: {readonly status: string}) {
			return (
				<Box flexDirection="column">
					<Cursor />
					<Text>{status}</Text>
				</Box>
			);
		}

		const app = render(<Test status="Waiting" />, {
			stdout,
			incrementalRendering: isIncrementalRendering,
		});
		t.after(() => {
			app.unmount();
		});
		await app.waitUntilRenderFlush();
		t.assert.ok(getWriteCalls(stdout).join('').includes(showCursorEscape));
		const writesBeforeUpdate = getWriteCalls(stdout).length;

		app.rerender(<Test status="Ready" />);
		await app.waitUntilRenderFlush();

		const output = getWriteCalls(stdout).slice(writesBeforeUpdate).join('');
		t.assert.strictEqual(cursorRenderCount, 1);
		t.assert.ok(output.includes('Ready'));
		t.assert.ok(output.includes(ansiEscapes.cursorTo(2) + showCursorEscape));
		t.assert.ok(
			output.lastIndexOf(showCursorEscape) >
				output.lastIndexOf(hideCursorEscape),
		);

		const writesBeforeUnmount = getWriteCalls(stdout).length;
		app.rerender(<Text>Finished</Text>);
		await app.waitUntilRenderFlush();
		const outputAfterUnmount = getWriteCalls(stdout)
			.slice(writesBeforeUnmount)
			.join('');
		t.assert.ok(outputAfterUnmount.includes('Finished'));
		t.assert.ok(outputAfterUnmount.includes(hideCursorEscape));
		t.assert.strictEqual(outputAfterUnmount.includes(showCursorEscape), false);
	});
}

test('cursor is not hidden by useEffect after first render', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<InputApp />, {stdout, stdin});
	await delay(50);

	// Check all writes after the first render — none should be a bare hideCursorEscape
	// that would undo the showCursorEscape from log-update.
	// The last write to stdout should contain showCursorEscape (from log-update),
	// not be followed by a separate hideCursorEscape write from App.tsx useEffect.
	const output = getWriteCalls(stdout).join('');
	const lastShowIndex = output.lastIndexOf(showCursorEscape);
	const lastHideIndex = output.lastIndexOf(hideCursorEscape);

	t.assert.ok(
		lastShowIndex > lastHideIndex,
		'last cursor visibility change should be SHOW, not HIDE',
	);

	unmount();
});

test('cursor follows text input', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<InputApp />, {stdout, stdin});
	await delay(50);

	emitReadable(stdin, 'a');
	await delay(50);

	// With isTTY=true, stdout.get() (lastCall) may be a synchronized output
	// wrapper rather than the render content, so check all writes combined.
	const allOutput = getWriteCalls(stdout).join('');
	// After typing 'a', cursor should be at x=3 ("> a" = 3 chars)
	t.assert.ok(allOutput.includes(showCursorEscape));
	t.assert.ok(
		allOutput.includes(ansiEscapes.cursorTo(3)),
		'cursor should move to column 3 after typing "a"',
	);

	unmount();
});

test('cursor moves on space input even when output is identical', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount, waitUntilRenderFlush} = render(<InputApp />, {
		stdout,
		stdin,
	});
	t.after(() => {
		unmount();
	});
	await waitUntilRenderFlush();

	emitReadable(stdin, 'a');
	await waitUntilRenderFlush();
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const afterA = (stdout.write as any).callCount;

	emitReadable(stdin, ' ');
	await waitUntilRenderFlush();

	// Space adds to text, cursor should move even if Ink output looks the same (padded)
	t.assert.ok(
		(stdout.write as any).callCount > afterA,
		'should write to stdout after space input',
	);

	// With isTTY=true, stdout.get() (lastCall) may be a synchronized output
	// wrapper rather than the render content, so check all writes combined.
	const allOutput = getWriteCalls(stdout).join('');
	// After "a ", cursor should be at x=4
	t.assert.ok(
		allOutput.includes(ansiEscapes.cursorTo(4)),
		'cursor should be at column 4 after "a "',
	);

	unmount();
});

test('cursor is cleared when component using useCursor unmounts', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	function CursorChild() {
		const {setCursorPosition} = useCursor();
		setCursorPosition({x: 5, y: 0});
		return <Text>child</Text>;
	}

	function Parent() {
		const [showChild, setShowChild] = useState(true);

		useInput((_input, key) => {
			if (key.return) {
				setShowChild(false);
			}
		});

		return <Box>{showChild ? <CursorChild /> : <Text>no cursor</Text>}</Box>;
	}

	const {unmount} = render(<Parent />, {stdout, stdin});
	await delay(50);

	// With isTTY=true, cli-cursor writes cursor escape sequences as separate
	// stdout.write calls, so check the combined initial render output.
	const initialRenderOutput = getWriteCalls(stdout).join('');
	t.assert.ok(
		initialRenderOutput.includes(showCursorEscape),
		'cursor should be visible initially',
	);

	const writesBeforeEnter = (stdout.write as any).callCount as number;

	// Unmount the child by pressing Enter
	emitReadable(stdin, '\r');
	await delay(50);

	// After child unmounts, cursor position should be cleared.
	// Only look at writes after the initial render to avoid counting
	// the initial render's cursor sequences.
	const outputAfterChildUnmount = getWriteCalls(stdout)
		.slice(writesBeforeEnter)
		.join('');
	const lastShowIndex = outputAfterChildUnmount.lastIndexOf(showCursorEscape);
	const lastHideIndex = outputAfterChildUnmount.lastIndexOf(hideCursorEscape);
	t.assert.ok(
		lastHideIndex > lastShowIndex,
		'cursor should be hidden after child with useCursor unmounts',
	);

	unmount();
});

test('cursor position does not leak from suspended concurrent render to fallback', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {promise, resolve: resolvePromise} = Promise.withResolvers<void>();

	let isSuspended = true;

	function CursorChild() {
		const {setCursorPosition} = useCursor();
		setCursorPosition({x: 5, y: 0}); // Render-phase side effect
		if (isSuspended) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw promise;
		}

		return <Text>loaded</Text>;
	}

	function Test() {
		return (
			<Suspense fallback={<Text>loading</Text>}>
				<CursorChild />
			</Suspense>
		);
	}

	await act(async () => {
		render(<Test />, {stdout, stdin, concurrent: true});
	});

	const fallbackOutput = getWriteCalls(stdout).join('');
	t.assert.ok(fallbackOutput.includes('loading'));
	t.assert.strictEqual(
		fallbackOutput.includes(showCursorEscape),
		false,
		'fallback output should not contain show cursor escape from suspended concurrent render',
	);

	// Cleanup: resolve promise and unmount
	isSuspended = false;
	resolvePromise();
	await act(async () => {
		await delay(50);
	});
});

test('screen does not scroll up on subsequent renders', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	function MultiLineApp() {
		const [text, setText] = useState('');
		const {setCursorPosition} = useCursor();

		useInput((input, key) => {
			if (input !== '' && !key.ctrl && !key.meta) {
				setText(previous => previous + input);
			}
		});

		setCursorPosition({x: 2 + text.length, y: 1});

		return (
			<Box flexDirection="column">
				<Text>Header</Text>
				<Text>{`> ${text}`}</Text>
			</Box>
		);
	}

	const {unmount} = render(<MultiLineApp />, {stdout, stdin});
	await delay(50);

	const writesBeforeInput = (stdout.write as any).callCount as number;

	emitReadable(stdin, 'x');
	await delay(50);

	// With isTTY=true, stdout.get() (lastCall) may be a synchronized output
	// wrapper rather than the render content, so check writes from the
	// second render combined.
	const secondRenderOutput = getWriteCalls(stdout)
		.slice(writesBeforeInput)
		.join('');
	// When cursor was at y=1 (line 1), next render should first cursorDown to bottom,
	// then erase. The write should contain cursorDown to return to bottom.
	// It should NOT just erase from cursor position (which would scroll screen up).
	t.assert.ok(
		secondRenderOutput.includes(hideCursorEscape),
		'should hide cursor before erase',
	);
	// The write should include the new text
	t.assert.ok(
		secondRenderOutput.includes('x'),
		'should contain the typed character',
	);

	unmount();
});

function StdoutWriteApp() {
	const {setCursorPosition} = useCursor();
	const {write} = useStdout();

	setCursorPosition({x: 2, y: 0});

	useEffect(() => {
		write('from stdout hook\n');
	}, [write]);

	return <Text>Hello</Text>;
}

function StderrWriteApp() {
	const {setCursorPosition} = useCursor();
	const {write} = useStderr();

	setCursorPosition({x: 2, y: 0});

	useEffect(() => {
		write('from stderr hook\n');
	}, [write]);

	return <Text>Hello</Text>;
}

type HookWriteCase = {
	readonly testName: string;
	readonly App: () => React.JSX.Element;
	readonly includeStderr?: boolean;
	readonly assertTargetWrite: (
		t: TestContext,
		output: string,
		stderr: NodeJS.WriteStream | undefined,
	) => void;
};

const hookWriteCases: HookWriteCase[] = [
	{
		testName: 'cursor remains visible after useStdout().write()',
		App: StdoutWriteApp,
		assertTargetWrite(t: TestContext, output) {
			t.assert.ok(output.includes('from stdout hook'));
		},
	},
	{
		testName: 'cursor remains visible after useStderr().write()',
		App: StderrWriteApp,
		includeStderr: true,
		assertTargetWrite(t: TestContext, _output, stderr) {
			t.assert.strictEqual((stderr?.write as any).called, true);
		},
	},
];

for (const testCase of hookWriteCases) {
	test(testCase.testName, async (t: TestContext) => {
		const stdout = createStdout();
		const stdin = createStdin();
		const stderr = testCase.includeStderr ? createStdout() : undefined;

		const {unmount} = render(
			<testCase.App />,
			stderr ? {stdout, stderr, stdin} : {stdout, stdin},
		);
		await delay(50);

		const output = getWriteCalls(stdout).join('');
		const lastShowIndex = output.lastIndexOf(showCursorEscape);
		const lastHideIndex = output.lastIndexOf(hideCursorEscape);

		testCase.assertTargetWrite(t, output, stderr);
		t.assert.ok(
			lastShowIndex > lastHideIndex,
			'last cursor visibility escape should be show after hook write',
		);

		unmount();
	});
}

function DebugStdoutWriteApp() {
	const {write} = useStdout();

	useEffect(() => {
		write('from stdout hook\n');
	}, [write]);

	return <Text>Hello</Text>;
}

function DebugStderrWriteApp() {
	const {write} = useStderr();

	useEffect(() => {
		write('from stderr hook\n');
	}, [write]);

	return <Text>Hello</Text>;
}

test('debug mode: useStdout().write() replays latest frame', async (t: TestContext) => {
	const stdout = createStdout();
	const {unmount} = render(<DebugStdoutWriteApp />, {stdout, debug: true});
	await waitForCondition(() =>
		getWriteCalls(stdout).some(write =>
			write.includes('from stdout hook\nHello'),
		),
	);

	const writes = getWriteCalls(stdout);
	const hookWrite = writes.find(write =>
		write.includes('from stdout hook\nHello'),
	);

	t.assert.notStrictEqual(hookWrite, undefined);
	t.assert.strictEqual(writes.includes(''), false);

	unmount();
});

test('debug mode: useStdout().write() does not leak into stderr', async (t: TestContext) => {
	const stdout = createStdout();
	const stderr = createStdout();
	const {unmount} = render(<DebugStdoutWriteApp />, {
		stdout,
		stderr,
		debug: true,
	});
	await waitForCondition(() =>
		getWriteCalls(stdout).some(write =>
			write.includes('from stdout hook\nHello'),
		),
	);

	const stderrWrites = getWriteCalls(stderr);
	t.assert.strictEqual(
		stderrWrites.some(write => write.includes('from stdout hook\n')),
		false,
	);
	t.assert.strictEqual(
		stderrWrites.some(write => write.includes('Hello')),
		false,
	);
	t.assert.strictEqual(stderrWrites.includes(''), false);

	unmount();
});

test('debug mode: useStderr().write() replays latest frame without empty writes', async (t: TestContext) => {
	const stdout = createStdout();
	const stderr = createStdout();
	const {unmount} = render(<DebugStderrWriteApp />, {
		stdout,
		stderr,
		debug: true,
	});
	await waitForCondition(() =>
		getWriteCalls(stderr).some(write => write.includes('from stderr hook\n')),
	);
	await waitForCondition(() => getWriteCalls(stdout).length > 1);

	const stdoutWrites = getWriteCalls(stdout);
	const stderrWrites = getWriteCalls(stderr);
	const stdoutWritesAfterInitialRender = stdoutWrites.slice(1);

	t.assert.ok(stderrWrites.some(write => write.includes('from stderr hook\n')));
	t.assert.strictEqual(
		stderrWrites.some(write => write.includes('Hello')),
		false,
	);
	t.assert.ok(stdoutWritesAfterInitialRender.length > 0);
	t.assert.ok(
		stdoutWritesAfterInitialRender.some(write => write.includes('Hello')),
	);
	t.assert.strictEqual(
		stdoutWritesAfterInitialRender.some(write =>
			write.includes('from stderr hook\n'),
		),
		false,
	);
	t.assert.strictEqual(stdoutWrites.includes(''), false);
	t.assert.strictEqual(stderrWrites.includes(''), false);

	unmount();
});

function DebugStderrWriteAfterRerenderApp() {
	const [text, setText] = useState('Initial');
	const {write} = useStderr();

	useEffect(() => {
		setText('Updated');
	}, []);

	useEffect(() => {
		if (text === 'Updated') {
			write('from stderr hook\n');
		}
	}, [text, write]);

	return <Text>{text}</Text>;
}

function DebugStdoutWriteAfterRerenderApp() {
	const [text, setText] = useState('Initial');
	const {write} = useStdout();

	useEffect(() => {
		setText('Updated');
	}, []);

	useEffect(() => {
		if (text === 'Updated') {
			write('from stdout hook\n');
		}
	}, [text, write]);

	return <Text>{text}</Text>;
}

test('debug mode: useStdout().write() replays rerendered frame', async (t: TestContext) => {
	const stdout = createStdout();
	const {unmount} = render(<DebugStdoutWriteAfterRerenderApp />, {
		stdout,
		debug: true,
	});
	await waitForCondition(() =>
		getWriteCalls(stdout).some(write =>
			write.includes('from stdout hook\nUpdated'),
		),
	);

	const stdoutWrites = getWriteCalls(stdout);

	t.assert.ok(
		stdoutWrites.some(write => write.includes('from stdout hook\nUpdated')),
	);
	t.assert.strictEqual(
		stdoutWrites.some(write => write.includes('from stdout hook\nInitial')),
		false,
	);
	t.assert.strictEqual(stdoutWrites.includes(''), false);

	unmount();
});

test('debug mode: useStderr().write() replays rerendered frame', async (t: TestContext) => {
	const stdout = createStdout();
	const stderr = createStdout();
	const {unmount} = render(<DebugStderrWriteAfterRerenderApp />, {
		stdout,
		stderr,
		debug: true,
	});
	await waitForCondition(() =>
		getWriteCalls(stderr).some(write => write.includes('from stderr hook\n')),
	);
	await waitForCondition(() =>
		getWriteCalls(stdout)
			.slice(1)
			.some(write => write.includes('Updated')),
	);

	const stdoutWrites = getWriteCalls(stdout);
	const stderrWrites = getWriteCalls(stderr);
	const stdoutWritesAfterInitialRender = stdoutWrites.slice(1);

	t.assert.ok(stderrWrites.some(write => write.includes('from stderr hook\n')));
	t.assert.strictEqual(
		stderrWrites.some(write => write.includes('Updated')),
		false,
	);
	t.assert.strictEqual(
		stderrWrites.some(write => write.includes('Initial')),
		false,
	);
	t.assert.ok(
		stdoutWritesAfterInitialRender.some(write => write.includes('Updated')),
	);
	t.assert.strictEqual(
		stdoutWritesAfterInitialRender.some(write => write.includes('Initial')),
		false,
	);
	t.assert.strictEqual(
		stdoutWritesAfterInitialRender.some(write =>
			write.includes('from stderr hook\n'),
		),
		false,
	);
	t.assert.strictEqual(stdoutWrites.includes(''), false);
	t.assert.strictEqual(stderrWrites.includes(''), false);

	unmount();
});

// Fullscreen frames are the only ones Ink renders without a trailing newline,
// which is what makes the cursor suffix measure from the last visible line
// rather than from one row past it. These drive that through the real
// `render()` wiring — `outputToRender = isFullscreen ? output : output + '\n'`
// — instead of handing log-update a hand-built string.

const fullscreenLines = (count: number, marker: string): string[] =>
	Array.from({length: count}, (_, index) =>
		index === 1 ? `Line ${index}${marker}` : `Line ${index}`,
	);

function FullscreenCursorApp({
	lineCount,
	cursorY,
	marker,
}: {
	readonly lineCount: number;
	readonly cursorY: number;
	readonly marker: string;
}) {
	const {setCursorPosition} = useCursor();
	setCursorPosition({x: 3, y: cursorY});

	return (
		<Box flexDirection="column">
			{fullscreenLines(lineCount, marker).map(line => (
				<Text key={line}>{line}</Text>
			))}
		</Box>
	);
}

// Both renderers need covering here. The trailing newline is omitted for
// fullscreen in either mode, but only the incremental renderer skips the final
// cursorNextLine to keep the cursor on the last line, so it is the one where
// the row basis is easiest to get wrong.
const inkRenderingModes = [
	{name: 'standard rendering', incremental: false},
	{name: 'incremental rendering', incremental: true},
] as const;

for (const {name, incremental} of inkRenderingModes) {
	test(`${name} - fullscreen: cursor lands on the requested row across rerender and cursor-only update`, async (t: TestContext) => {
		const stdout = createStdout();
		// Output that exactly fills the viewport is fullscreen, so Ink omits
		// the trailing newline and the renderer stops on the last visible line.
		(stdout as any).rows = 5;

		const {rerender, unmount, waitUntilRenderFlush} = render(
			<FullscreenCursorApp lineCount={5} cursorY={2} marker="" />,
			{stdout, incrementalRendering: incremental},
		);
		await waitUntilRenderFlush();

		// 5 lines with no trailing newline: the cursor is left on row 4, so
		// reaching y=2 is cursorUp(2). Measuring from the visible-line count
		// instead would emit cursorUp(3) and land a row too high.
		const expected =
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(3) + showCursorEscape;
		const overshoot =
			ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(3) + showCursorEscape;

		const firstRender = getWriteCalls(stdout).join('');
		t.assert.ok(firstRender.includes(expected), 'first frame');
		t.assert.strictEqual(
			firstRender.includes(overshoot),
			false,
			'first frame does not overshoot',
		);

		const writesBeforeRerender = (stdout.write as any).callCount as number;
		rerender(<FullscreenCursorApp lineCount={5} cursorY={2} marker="!" />);
		await waitUntilRenderFlush();

		const changedRerender = getWriteCalls(stdout)
			.slice(writesBeforeRerender)
			.join('');
		// Incremental updates may write only the changed suffix. Assert the
		// resulting screen instead of requiring the whole line in one write.
		t.assert.deepStrictEqual(
			reconstructTerminalLines(
				getWriteCalls(stdout).join('').replaceAll('\n', '\r\n'),
				5,
			),
			fullscreenLines(5, '!'),
			'content actually changed',
		);
		t.assert.ok(changedRerender.includes(expected), 'changed rerender');
		t.assert.strictEqual(
			changedRerender.includes(overshoot),
			false,
			'changed rerender does not overshoot',
		);

		const writesBeforeCursorMove = (stdout.write as any).callCount as number;
		rerender(<FullscreenCursorApp lineCount={5} cursorY={0} marker="!" />);
		await waitUntilRenderFlush();

		// Output is unchanged, so this takes the cursor-only path, which derives
		// the bottom row from previousLineCount (5) rather than from the output.
		// Not on Windows: fullscreen frames there always take the clearing
		// path instead, so the expected sequence comes from sync(). It works
		// out to the same bytes, because both measure from lines.length - 1.
		const cursorOnly = getWriteCalls(stdout)
			.slice(writesBeforeCursorMove)
			.join('');
		t.assert.ok(
			cursorOnly.includes(
				ansiEscapes.cursorUp(4) + ansiEscapes.cursorTo(3) + showCursorEscape,
			),
			'cursor-only update',
		);
		t.assert.strictEqual(
			cursorOnly.includes(
				ansiEscapes.cursorUp(5) + ansiEscapes.cursorTo(3) + showCursorEscape,
			),
			false,
			'cursor-only update does not overshoot',
		);

		unmount();
	});
}

// Both renderers again: `sync()` is a separate implementation in each, so
// identical behaviour today is not a reason to leave one of them untested.
for (const {name, incremental} of inkRenderingModes) {
	test(`${name} - fullscreen: cursor lands on the requested row on the sync path`, async (t: TestContext) => {
		const stdout = createStdout();
		(stdout as any).rows = 5;

		// Output taller than the viewport is still fullscreen, and the second
		// such frame clears the terminal and repositions through log.sync()
		// rather than through the renderer's normal write path.
		const {rerender, unmount, waitUntilRenderFlush} = render(
			<FullscreenCursorApp lineCount={6} cursorY={2} marker="" />,
			{stdout, incrementalRendering: incremental},
		);
		await waitUntilRenderFlush();

		const writesBeforeRerender = (stdout.write as any).callCount as number;
		rerender(<FullscreenCursorApp lineCount={6} cursorY={2} marker="!" />);
		await waitUntilRenderFlush();

		const synced = getWriteCalls(stdout).slice(writesBeforeRerender).join('');
		t.assert.ok(synced.includes(homeAndEraseDown), 'took the sync path');
		// 6 lines with no trailing newline: the cursor is left on row 5, so y=2
		// is cursorUp(3), not the cursorUp(4) a visible-line-count basis gives.
		t.assert.ok(
			synced.includes(
				ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(3) + showCursorEscape,
			),
		);
		t.assert.strictEqual(
			synced.includes(
				ansiEscapes.cursorUp(4) + ansiEscapes.cursorTo(3) + showCursorEscape,
			),
			false,
		);

		unmount();
	});
}
