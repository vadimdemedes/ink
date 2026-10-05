import test, {type TestContext} from 'node:test';
import React, {Suspense, useEffect, useState} from 'react';
import ansiEscapes from 'ansi-escapes';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import ansiStyles from 'ansi-styles';
import chalk from 'chalk';
import {
	render,
	Box,
	Text,
	useInput,
	useStdout,
	useStderr,
	Cursor,
	type CursorPosition,
	renderToString,
	Transform,
} from '../src/index.js';
import {homeAndEraseDown} from '../src/ink.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import createStdout, {type FakeStdout} from './helpers/create-stdout.js';
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

type InteractiveRenderOptions = {
	stdoutColumns?: number;
};
type InteractiveRenderProps = {
	waitUntilRenderFlush: () => Promise<void>;
	stdin: NodeJS.WriteStream;
	stdout: FakeStdout;
	getLastCursor: () => CursorPosition | undefined;
	getWriteCallsString: () => string;
	getLastTrimmedRender: () => string;
};
type InteractiveRenderHandler = (
	props: InteractiveRenderProps,
) => Promise<void> | void;

async function withInteractiveRender(
	node: React.ReactNode,
	handler: InteractiveRenderHandler,
): Promise<void>;
async function withInteractiveRender(
	node: React.ReactNode,
	options: InteractiveRenderOptions,
	handler: InteractiveRenderHandler,
): Promise<void>;
async function withInteractiveRender(
	node: React.ReactNode,
	optionsOrHandler: InteractiveRenderHandler | InteractiveRenderOptions,
	providedHandler?: InteractiveRenderHandler,
) {
	const options =
		providedHandler === undefined
			? {}
			: (optionsOrHandler as InteractiveRenderOptions);
	const handler =
		providedHandler ?? (optionsOrHandler as InteractiveRenderHandler);

	const stdout = createStdout(options.stdoutColumns ?? 5);
	const stdin = createStdin();

	// Ensure any Text style params are respected:
	const oldChalkLevel = chalk.level;
	chalk.level = 3;

	let lastCursor: CursorPosition | undefined;
	const onCursorUpdated = (cursor: CursorPosition | undefined) => {
		lastCursor = cursor;
	};

	const {unmount, waitUntilRenderFlush} = render(node, {
		stdout,
		stdin,
		onCursorUpdated,
	});

	const getWriteCallsString = () => getWriteCalls(stdout).join('');

	try {
		await waitUntilRenderFlush();
		await handler({
			waitUntilRenderFlush,
			stdin,
			stdout,
			getLastCursor: () => lastCursor,
			getWriteCallsString,
			getLastTrimmedRender: () => stripAnsi(getWriteCallsString()).trim(),
		});
	} finally {
		chalk.level = oldChalkLevel;
		unmount();
	}
}

type InputAppProps = {
	readonly initialText?: string;
	readonly offset?: number;
};

function InputApp({initialText = '', offset}: InputAppProps) {
	const [text, setText] = useState(initialText);

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(previous => previous.slice(0, -1));
			return;
		}

		if (input !== '' && !key.ctrl && !key.meta) {
			setText(previous => previous + input);
		}
	});

	let before = text;
	let after = null;
	if (offset !== undefined) {
		before = text.slice(0, offset);
		after = text.slice(offset);
	}

	return (
		<Box>
			<Text>
				{`> ${before}`}
				<Cursor />
				{after}
			</Text>
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

	const {unmount} = render(<InputApp />, {stdout, stdin});
	await delay(50);

	emitReadable(stdin, 'a');
	await delay(50);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const afterA = (stdout.write as any).callCount;

	emitReadable(stdin, ' ');
	await delay(50);

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

test('cursor is cleared when component using <Cursor /> unmounts', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	function CursorChild() {
		return (
			<Text>
				child
				<Cursor />
			</Text>
		);
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
		'cursor should be hidden after child with <Cursor> unmounts',
	);

	unmount();
});

test('cursor position does not leak from suspended concurrent render to fallback', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {promise, resolve: resolvePromise} = Promise.withResolvers<void>();

	let isSuspended = true;

	function CursorChild() {
		if (isSuspended) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw promise;
		}

		return (
			<Text>
				loaded
				<Cursor />
			</Text>
		);
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

		useInput((input, key) => {
			if (input !== '' && !key.ctrl && !key.meta) {
				setText(previous => previous + input);
			}
		});

		return (
			<Box flexDirection="column">
				<Text>Header</Text>
				<Text>
					{`> ${text}`}
					<Cursor />
				</Text>
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
	const {write} = useStdout();

	useEffect(() => {
		write('from stdout hook\n');
	}, [write]);

	return (
		<Text>
			He
			<Cursor />
			llo
		</Text>
	);
}

function StderrWriteApp() {
	const {write} = useStderr();

	useEffect(() => {
		write('from stderr hook\n');
	}, [write]);

	return (
		<Text>
			He
			<Cursor />
			llo
		</Text>
	);
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
			t.assert.strictEqual((stderr?.write as any)?.called, true);
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
	return (
		<Box flexDirection="column">
			{fullscreenLines(lineCount, marker).map((line, i) => (
				<Text key={line}>
					{line.slice(0, 3)}
					{i === cursorY && <Cursor />}
					{line.slice(3)}
				</Text>
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
		t.assert.ok(
			changedRerender.includes('Line 1!'),
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

		let lastCursor: CursorPosition | undefined;
		const onCursorUpdated = (cursor: CursorPosition | undefined) => {
			lastCursor = cursor;
		};

		// Output taller than the viewport is still fullscreen, and the second
		// such frame clears the terminal and repositions through log.sync()
		// rather than through the renderer's normal write path.
		const {rerender, unmount, waitUntilRenderFlush} = render(
			<FullscreenCursorApp lineCount={6} cursorY={2} marker="" />,
			{stdout, incrementalRendering: incremental, onCursorUpdated},
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

		t.assert.deepStrictEqual(lastCursor, {x: 3, y: 2});

		unmount();
	});
}

for (const [i, config] of (
	[
		{text: '', cursorTo: 2, cursorUp: 1, cursor: {x: 2, y: 0}},
		{text: 'the quick', cursorTo: 5, cursorUp: 1, cursor: {x: 5, y: 2}},
		{text: '3456 7', cursorTo: 1, cursorUp: 1, cursor: {x: 1, y: 2}},
		{text: '3456 7', cursorTo: 1, cursorUp: 1, cursor: {x: 1, y: 2}},
	] as const
).entries()) {
	test(`cursor wraps after text #${i}`, async (t: TestContext) => {
		const stdout = createStdout(5);
		const stdin = createStdin();

		let lastCursor: CursorPosition | undefined;
		const onCursorUpdated = (cursor: CursorPosition | undefined) => {
			lastCursor = cursor;
		};

		const {unmount, waitUntilRenderFlush} = render(
			<InputApp initialText={config.text} />,
			{stdout, stdin, onCursorUpdated},
		);
		await waitUntilRenderFlush();

		const firstRenderOutput = getWriteCalls(stdout).join('');
		t.assert.ok(
			firstRenderOutput.includes(showCursorEscape),
			'cursor should be visible after first render',
		);
		t.assert.deepStrictEqual(
			lastCursor,
			config.cursor,
			`cursor should be at ${JSON.stringify(config.cursor)}`,
		);
		t.assert.ok(
			firstRenderOutput.includes(ansiEscapes.cursorTo(config.cursorTo)),
			`cursor should be at column ${config.cursorTo}; saw ${JSON.stringify(firstRenderOutput)}`,
		);
		// It renders with a trailing newline, so need to move up one row
		t.assert.ok(
			firstRenderOutput.includes(ansiEscapes.cursorUp(config.cursorUp)),
			`cursor should be on last visible line - ${config.cursorUp - 1}`,
		);

		unmount();
	});
}

for (const [i, config] of (
	[
		{text: '01 345', offset: 3, cursorTo: 0, cursorUp: 1, cursor: {x: 0, y: 1}},
		{text: '0\n23', offset: 3, cursorTo: 1, cursorUp: 1, cursor: {x: 1, y: 1}},
	] as const
).entries()) {
	test(`cursor wraps within text #${i}`, async (t: TestContext) => {
		await withInteractiveRender(
			<InputApp initialText={config.text} offset={config.offset} />,
			({stdout, getLastCursor}) => {
				const firstRenderOutput = getWriteCalls(stdout).join('');
				// Cursor should be shown at x=2 (after "> ")
				t.assert.ok(
					firstRenderOutput.includes(showCursorEscape),
					'cursor should be visible after first render',
				);
				t.assert.deepStrictEqual(
					getLastCursor(),
					config.cursor,
					`cursor should be at ${JSON.stringify(config.cursor)}`,
				);
				t.assert.ok(
					firstRenderOutput.includes(ansiEscapes.cursorTo(config.cursorTo)),
					`cursor should be at column ${config.cursorTo}; saw ${JSON.stringify(firstRenderOutput)}`,
				);
				// It renders with a trailing newline, so need to move up one row
				t.assert.ok(
					firstRenderOutput.includes(ansiEscapes.cursorUp(config.cursorUp)),
					`cursor should be on last visible line - ${config.cursorUp - 1}`,
				);
			},
		);
	});
}

test('overflowX - single text node inside overflow container with <Cursor />', (t: TestContext) => {
	const output = renderToString(
		<Box width={5} overflowX="hidden">
			<Box width={16} flexShrink={0}>
				<Text>
					<Cursor />
					Hello World
				</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output), 'Hello');
});

for (const {wrap, expected} of [
	{wrap: 'truncate-end', expected: 'Hell…'},
	{wrap: 'truncate-middle', expected: 'He…ld'},
	{wrap: 'truncate-start', expected: '…orld'},
] as const) {
	test(`wrap=${wrap} - single text node wrapping with <Cursor /> at start`, async (t: TestContext) => {
		await withInteractiveRender(
			<Box width={5}>
				<Text wrap={wrap}>
					<Cursor />
					Hello World
				</Text>
			</Box>,
			async ({getLastCursor, getLastTrimmedRender}) => {
				t.assert.strictEqual(getLastTrimmedRender(), expected);
				t.assert.deepStrictEqual(getLastCursor(), {x: 0, y: 0});
			},
		);
	});
}

for (const {wrap, expected} of [
	{wrap: 'truncate-end', expected: 'Hell…'},
	{wrap: 'truncate-middle', expected: 'He…ld'},
	{wrap: 'truncate-start', expected: '…orld'},
] as const) {
	test(`wrap=${wrap} - single text node wrapping with <Cursor /> at end`, async (t: TestContext) => {
		await withInteractiveRender(
			<Box width={5}>
				<Text wrap={wrap}>
					Hello World
					<Cursor />
				</Text>
			</Box>,
			async ({getLastCursor, getLastTrimmedRender}) => {
				t.assert.strictEqual(getLastTrimmedRender(), expected);
				t.assert.deepStrictEqual(getLastCursor(), {x: 5, y: 0});
			},
		);
	});
}

test('truncate-middle with truncated <Cursor /> renders on the ellipsis', async (t: TestContext) => {
	await withInteractiveRender(
		<Box width={5}>
			<Text wrap="truncate-middle">
				Hello
				<Cursor />
				World
			</Text>
		</Box>,
		async ({getLastCursor}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 2, y: 0});
		},
	);
});

test('wrap=truncate-middle - cursor in retained suffix', async (t: TestContext) => {
	await withInteractiveRender(
		<Box width={6}>
			<Text wrap="truncate-middle">
				abcdefg
				<Cursor />
				hi
			</Text>
		</Box>,
		async ({getLastCursor, getLastTrimmedRender}) => {
			t.assert.strictEqual(getLastTrimmedRender(), 'abc…hi');
			t.assert.deepStrictEqual(getLastCursor(), {x: 4, y: 0});
		},
	);
});

test('wrap=truncate-middle - cursor within retained suffix', async (t: TestContext) => {
	await withInteractiveRender(
		<Box width={6}>
			<Text wrap="truncate-middle">
				abcdefgh
				<Cursor />i
			</Text>
		</Box>,
		async ({getLastCursor, getLastTrimmedRender}) => {
			t.assert.strictEqual(getLastTrimmedRender(), 'abc…hi');
			t.assert.deepStrictEqual(getLastCursor(), {x: 5, y: 0});
		},
	);
});

test('wrap=truncate-middle - multiline with cursor on second line', async (t: TestContext) => {
	await withInteractiveRender(
		<Box width={5}>
			<Text wrap="truncate-middle">
				first long line
				{'\n'}
				Hello
				<Cursor />
				World
			</Text>
		</Box>,
		async ({getLastCursor, getLastTrimmedRender}) => {
			t.assert.strictEqual(getLastTrimmedRender(), 'fi…ne\nHe…ld');
			t.assert.deepStrictEqual(getLastCursor(), {x: 2, y: 1});
		},
	);
});

test('padding with <Cursor /> is counted once', async (t: TestContext) => {
	await withInteractiveRender(
		<Box padding={2}>
			<Text>
				<Cursor />X
			</Text>
		</Box>,
		({getLastCursor}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 2, y: 2});
		},
	);
});

test('<Cursor /> does not pollute screen readers', (t: TestContext) => {
	const stdout = createStdout(100);
	const {unmount} = render(
		<Box>
			<Text>
				Hello <Cursor />
				World
			</Text>
		</Box>,
		{
			stdout,
			debug: true,
			isScreenReaderEnabled: true,
		},
	);

	const output = stdout.get();

	t.assert.strictEqual(output, 'Hello World');

	unmount();
});

test('<Cursor /> handles wide characters', async (t: TestContext) => {
	await withInteractiveRender(
		<Box>
			<Text>
				你好你
				<Cursor />
			</Text>
		</Box>,
		{stdoutColumns: 4},
		({getLastCursor}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 2, y: 1});
		},
	);
});

test('<Cursor /> interleaves in wide and narrow characters', async (t: TestContext) => {
	await withInteractiveRender(
		<Box>
			<Text>
				{'> '}你好
				<Cursor />你
			</Text>
		</Box>,
		{stdoutColumns: 4},
		({getLastCursor}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 2, y: 1});
		},
	);
});

test('<Cursor /> handles ansi sanitization', async (t: TestContext) => {
	await withInteractiveRender(
		<Box>
			<Text>
				A{'\u{1B}[2J'}
				B
				<Cursor />C
			</Text>
		</Box>,
		{stdoutColumns: 4},
		({getLastCursor}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 2, y: 0});
		},
	);
});

test('<Cursor /> handles styling', async (t: TestContext) => {
	await withInteractiveRender(
		<Box>
			<Text>
				<Text color="red">ABCD</Text>
				<Cursor />E
			</Text>
		</Box>,
		{stdoutColumns: 3},
		({getLastCursor}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 1, y: 1});
		},
	);
});

test('<Cursor /> handles placement within styling', async (t: TestContext) => {
	await withInteractiveRender(
		<Box>
			<Text>
				<Text color="red">
					A
					<Cursor />B
				</Text>
				C
			</Text>
		</Box>,
		{stdoutColumns: 3},
		({getLastCursor, getWriteCallsString}) => {
			t.assert.ok(getWriteCallsString().includes(ansiStyles.red.open));
			t.assert.deepStrictEqual(getLastCursor(), {x: 1, y: 0});
		},
	);
});

test('<Cursor /> handles style-adding transforms', async (t: TestContext) => {
	const stdout = createStdout(3);
	const stdin = createStdin();

	let lastCursor: CursorPosition | undefined;
	const onCursorUpdated = (cursor: CursorPosition | undefined) => {
		lastCursor = cursor;
	};

	const addStyle = (s: string) =>
		ansiStyles.red.open + s + ansiStyles.red.close;

	const {unmount, waitUntilRenderFlush} = render(
		<Box>
			<Text>
				<Transform transform={addStyle}>ABCD</Transform>
				<Cursor />E
			</Text>
		</Box>,
		{stdout, stdin, onCursorUpdated},
	);
	await waitUntilRenderFlush();

	t.assert.deepStrictEqual(lastCursor, {x: 1, y: 1});

	unmount();
});

test('<Cursor /> is hidden when clipped via overflow', async (t: TestContext) => {
	await withInteractiveRender(
		<Box width={3} overflowX="hidden">
			<Box width={16} flexShrink={0}>
				<Text>
					ABCD
					<Cursor />E
				</Text>
			</Box>
		</Box>,
		{stdoutColumns: 3},
		({getLastCursor, getWriteCallsString}) => {
			t.assert.strictEqual(getLastCursor(), undefined);

			const firstRenderOutput = getWriteCallsString();
			t.assert.strictEqual(
				firstRenderOutput.includes(showCursorEscape),
				false,
				'cursor should NOT be visible after first render',
			);
		},
	);
});

test('<Cursor /> is shown when rendered by itself', async (t: TestContext) => {
	await withInteractiveRender(
		<Box width={3} overflowX="hidden">
			<Cursor />
		</Box>,
		{stdoutColumns: 3},
		({getLastCursor, getWriteCallsString}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 0, y: 0});

			const firstRenderOutput = getWriteCallsString();
			t.assert.ok(
				firstRenderOutput.includes(showCursorEscape),
				'cursor should be visible after first render',
			);
		},
	);
});

test('<Cursor /> within truncate', async (t: TestContext) => {
	await withInteractiveRender(
		<Box>
			<Text wrap="truncate-end">
				a
				<Cursor />b
			</Text>
		</Box>,
		({getLastCursor, getWriteCallsString}) => {
			t.assert.deepStrictEqual(getLastCursor(), {x: 1, y: 0});

			const firstRenderOutput = getWriteCallsString();
			t.assert.ok(
				firstRenderOutput.includes(showCursorEscape),
				'cursor should be visible after first render',
			);
		},
	);
});

test('Clipped cursors should be hidden', async (t: TestContext) => {
	await withInteractiveRender(
		<Box flexDirection="row" height={1}>
			<Box width={2} overflow="hidden">
				<Text>
					ab
					<Cursor />c
				</Text>
			</Box>
			<Box>
				<Text>other</Text>
			</Box>
		</Box>,
		{stdoutColumns: 100},
		({getLastCursor, getLastTrimmedRender}) => {
			t.assert.strictEqual(getLastTrimmedRender(), 'abother');
			t.assert.strictEqual(getLastCursor(), undefined);
		},
	);
});

test('Handle sanitized control characters', async (t: TestContext) => {
	await withInteractiveRender(
		<Box flexDirection="row" height={1}>
			<Text>
				A{'\x07'}
				<Cursor />
				BC
			</Text>
		</Box>,
		{stdoutColumns: 100},
		({getLastCursor, getLastTrimmedRender}) => {
			t.assert.strictEqual(getLastTrimmedRender(), 'ABC');
			t.assert.deepEqual(getLastCursor(), {x: 1, y: 0});
		},
	);
});
