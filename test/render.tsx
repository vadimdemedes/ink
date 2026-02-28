import process from 'node:process';
import vm from 'node:vm';
import {spawn as spawnProcess} from 'node:child_process';
import {PassThrough, Writable} from 'node:stream';
import url from 'node:url';
import * as path from 'node:path';
import {createRequire} from 'node:module';
import FakeTimers from '@sinonjs/fake-timers';
import {stub} from 'sinon';
import test, {type ExecutionContext} from 'ava';
import React, {
	type ReactElement,
	type ReactNode,
	PureComponent,
	useEffect,
	useState,
} from 'react';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import boxen from 'boxen';
import delay from 'delay';
import {render, Box, Text, useApp, useCursor, useInput} from '../src/index.js';
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
			'--import=tsx',
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

const countOccurrences = (text: string, searchValue: string): number => {
	if (searchValue === '') {
		return 0;
	}

	return text.split(searchValue).length - 1;
};

const isWriteBarrierChunk = (chunk: string | Uint8Array): boolean =>
	(typeof chunk === 'string' && chunk === '') ||
	(chunk instanceof Uint8Array && chunk.length === 0);

const toRenderedChunk = (chunk: string | Uint8Array): string =>
	stripAnsi(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());

const createDelayedWriteCallbackStdout = ({
	shouldDelay,
	onDelayElapsed,
	delayMs = 150,
}: {
	readonly shouldDelay: (chunk: string | Uint8Array) => boolean;
	readonly onDelayElapsed: () => void;
	readonly delayMs?: number;
}): NodeJS.WriteStream => {
	let didDelayOnce = false;

	const stdout = new Writable({
		write(
			chunk: string | Uint8Array,
			_encoding: BufferEncoding,
			callback: (error?: Error) => void,
		) {
			if (!didDelayOnce && shouldDelay(chunk)) {
				didDelayOnce = true;

				setTimeout(() => {
					onDelayElapsed();
					callback();
				}, delayMs);

				return;
			}

			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;
	return stdout;
};

type Issue450Fixture =
	| 'issue-450-full-height-rerender'
	| 'issue-450-full-height-rerender-with-marker'
	| 'issue-450-height-minus-one-rerender'
	| 'issue-450-full-height-with-static-rerender'
	| 'issue-450-initial-overflow'
	| 'issue-450-initial-fullscreen'
	| 'issue-450-grow-to-fullscreen-rerender'
	| 'issue-450-shrink-from-fullscreen-rerender'
	| 'issue-450-shrink-from-overflow-rerender'
	| 'issue-450-static-shrink-from-fullscreen-rerender';

const runIssue450Fixture = async (
	fixture: Issue450Fixture,
	rows = 6,
): Promise<string> => {
	const processResult = term(fixture, [String(rows)]);
	await processResult.waitForExit();
	return processResult.output;
};

const runNonTtyFixture = async (
	fixture: string,
	args: string[] = [],
): Promise<string> => {
	let output = '';
	let errorOutput = '';
	const env = {
		...process.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_NO_WARNINGS: '1',
	};
	// Force non-CI code path while still using a non-TTY stdout stream.
	env.CI = 'false';

	const fixtureProcess = spawnProcess(
		'node',
		[
			'--import=tsx',
			path.join(__dirname, `./fixtures/${fixture}.tsx`),
			...args,
		],
		{
			cwd: __dirname,
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);

	fixtureProcess.stdout.on('data', (data: Uint8Array | string) => {
		output += typeof data === 'string' ? data : data.toString();
	});

	fixtureProcess.stderr.on('data', (data: Uint8Array | string) => {
		errorOutput += typeof data === 'string' ? data : data.toString();
	});

	const exitCode = await new Promise<number>((resolve, reject) => {
		fixtureProcess.on('error', reject);
		fixtureProcess.on('close', code => {
			resolve(code ?? 0);
		});
	});

	if (exitCode !== 0) {
		throw new Error(
			`Non-TTY fixture exited with code ${exitCode}: ${errorOutput}`,
		);
	}

	return output;
};

type Issue450FixtureResult = {
	output: string;
	clearTerminalCount: number;
	eraseLineCount: number;
};

const getIssue450ControlSequenceCounts = (output: string) => ({
	clearTerminalCount: countOccurrences(output, ansiEscapes.clearTerminal),
	eraseLineCount: countOccurrences(output, ansiEscapes.eraseLines(1)),
});

const runIssue450FixtureWithCounts = async (
	fixture: Issue450Fixture,
	rows = 6,
): Promise<Issue450FixtureResult> => {
	const output = await runIssue450Fixture(fixture, rows);
	const {clearTerminalCount, eraseLineCount} =
		getIssue450ControlSequenceCounts(output);

	return {
		output,
		clearTerminalCount,
		eraseLineCount,
	};
};

const getOutputBeforeMarker = (
	t: ExecutionContext,
	output: string,
	marker: string,
): string => {
	const markerIndex = output.indexOf(marker);
	t.true(markerIndex >= 0, `Fixture marker "${marker}" should be present`);
	return markerIndex >= 0 ? output.slice(0, markerIndex) : output;
};

const runIssue450FixtureBeforeMarker = async (
	t: ExecutionContext,
	fixture: Issue450Fixture,
	marker: string,
	rows = 6,
): Promise<string> => {
	const output = await runIssue450Fixture(fixture, rows);
	return getOutputBeforeMarker(t, output, marker);
};

const assertIssue450DynamicFrameOutput = (
	t: ExecutionContext,
	output: string,
): void => {
	t.true(
		output.includes('frame 8'),
		'Fixture should render multiple dynamic frames',
	);
};

class SynchronousErrorBoundary extends PureComponent<
	{
		onError: (error: Error) => void;
		children?: ReactElement;
	},
	{error?: Error}
> {
	static displayName = 'SynchronousErrorBoundary';

	static override getDerivedStateFromError(error: Error) {
		return {error};
	}

	override state: {error?: Error} = {
		error: undefined,
	};

	override componentDidCatch(error: Error) {
		this.props.onError(error);
	}

	override render() {
		if (this.state.error) {
			return null;
		}

		return this.props.children;
	}
}

function SynchronousRenderErrorComponent() {
	throw new Error('Synchronous render error');
}

function ThrowingComponentWithBoundary() {
	const {exit} = useApp();

	return (
		<SynchronousErrorBoundary onError={exit}>
			<SynchronousRenderErrorComponent />
		</SynchronousErrorBoundary>
	);
}

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

test.serial(
	'#450: full-height rerenders should not repeatedly clear terminal',
	async t => {
		const {output, clearTerminalCount, eraseLineCount} =
			await runIssue450FixtureWithCounts('issue-450-full-height-rerender');

		assertIssue450DynamicFrameOutput(t, output);
		t.true(
			clearTerminalCount <= 1,
			`Expected at most one clearTerminal sequence, received ${clearTerminalCount}`,
		);
		t.true(
			eraseLineCount > 0,
			'Expected incremental erase sequences for fullscreen rerenders',
		);
	},
);

test.serial(
	'#450: initial overflowing frame should not clear terminal',
	async t => {
		const renderedMarker = '__INITIAL_OVERFLOW_FRAME_RENDERED__';
		const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
			t,
			'issue-450-initial-overflow',
			renderedMarker,
			3,
		);

		t.false(
			outputBeforeMarker.includes(ansiEscapes.clearTerminal),
			'Initial overflowing render should not clear terminal',
		);
	},
);

test.serial(
	'#450: initial full-height frame should not clear terminal',
	async t => {
		const renderedMarker = '__INITIAL_FULLSCREEN_FRAME_RENDERED__';
		const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
			t,
			'issue-450-initial-fullscreen',
			renderedMarker,
			3,
		);

		t.false(
			outputBeforeMarker.includes(ansiEscapes.clearTerminal),
			'Initial full-height render should not clear terminal',
		);
	},
);

test.serial(
	'#450 control: rows - 1 rerenders should avoid clearTerminal',
	async t => {
		const {output, clearTerminalCount, eraseLineCount} =
			await runIssue450FixtureWithCounts('issue-450-height-minus-one-rerender');

		assertIssue450DynamicFrameOutput(t, output);
		t.is(clearTerminalCount, 0);
		t.true(
			eraseLineCount > 0,
			'Expected incremental erase sequences for non-fullscreen rerenders',
		);
	},
);

test.serial(
	'#450: full-height rerenders should not clear before unmount',
	async t => {
		const renderedMarker = '__FULL_HEIGHT_RERENDER_COMPLETED__';
		const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
			t,
			'issue-450-full-height-rerender-with-marker',
			renderedMarker,
		);
		const {clearTerminalCount} =
			getIssue450ControlSequenceCounts(outputBeforeMarker);

		assertIssue450DynamicFrameOutput(t, outputBeforeMarker);
		t.is(clearTerminalCount, 0);
	},
);

test.serial(
	'#450: grow from rows - 1 to full-height should not clear before unmount',
	async t => {
		const renderedMarker = '__GROW_TO_FULLSCREEN_RERENDER_COMPLETED__';
		const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
			t,
			'issue-450-grow-to-fullscreen-rerender',
			renderedMarker,
		);
		const {clearTerminalCount} =
			getIssue450ControlSequenceCounts(outputBeforeMarker);

		assertIssue450DynamicFrameOutput(t, outputBeforeMarker);
		t.is(clearTerminalCount, 0);
	},
);

test.serial(
	'#450: shrink from full-height to rows - 1 should clear exactly once',
	async t => {
		const {output, clearTerminalCount} = await runIssue450FixtureWithCounts(
			'issue-450-shrink-from-fullscreen-rerender',
		);

		assertIssue450DynamicFrameOutput(t, output);
		t.is(clearTerminalCount, 1);
	},
);

test.serial(
	'#450: shrink from overflow to rows - 1 should clear exactly once',
	async t => {
		const {output, clearTerminalCount} = await runIssue450FixtureWithCounts(
			'issue-450-shrink-from-overflow-rerender',
		);

		assertIssue450DynamicFrameOutput(t, output);
		t.is(clearTerminalCount, 1);
	},
);

test.serial(
	'#450: <Static> with shrink from full-height should clear exactly once',
	async t => {
		const {output, clearTerminalCount} = await runIssue450FixtureWithCounts(
			'issue-450-static-shrink-from-fullscreen-rerender',
		);

		t.true(output.includes('#450 static line'));
		assertIssue450DynamicFrameOutput(t, output);
		t.is(clearTerminalCount, 1);
	},
);

test.serial(
	'#450: non-TTY full-height rerenders should never clear terminal',
	t => {
		const rows = 6;
		const stdout = createStdout();
		stdout.rows = rows;
		const writes = captureWrites(stdout);

		function NonTtyRerenderTestComponent({
			frameCount,
		}: {
			readonly frameCount: number;
		}) {
			return (
				<Box height={rows} flexDirection="column">
					<Text>#450 top</Text>
					<Box flexGrow={1}>
						<Text>{`frame ${frameCount}`}</Text>
					</Box>
					<Text>#450 bottom</Text>
				</Box>
			);
		}

		const {rerender, unmount} = render(
			<NonTtyRerenderTestComponent frameCount={0} />,
			{stdout},
		);

		rerender(<NonTtyRerenderTestComponent frameCount={1} />);
		rerender(<NonTtyRerenderTestComponent frameCount={2} />);

		const {clearTerminalCount} = getIssue450ControlSequenceCounts(
			writes.join(''),
		);
		t.is(clearTerminalCount, 0);

		unmount();
	},
);

test.serial(
	'#450: non-TTY overflow transitions should never clear terminal',
	t => {
		const rows = 3;
		const stdout = createStdout();
		stdout.rows = rows;
		const writes = captureWrites(stdout);

		function NonTtyOverflowTransitionTestComponent({
			lineCount,
		}: {
			readonly lineCount: number;
		}) {
			const lines = [];
			for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
				lines.push(<Text key={lineNumber}>{`line ${lineNumber}`}</Text>);
			}

			return <Box flexDirection="column">{lines}</Box>;
		}

		const {rerender, unmount} = render(
			<NonTtyOverflowTransitionTestComponent lineCount={2} />,
			{stdout},
		);

		rerender(<NonTtyOverflowTransitionTestComponent lineCount={4} />);

		const {clearTerminalCount} = getIssue450ControlSequenceCounts(
			writes.join(''),
		);
		t.is(clearTerminalCount, 0);

		unmount();
	},
);

test.serial(
	'#450: viewport shrink into overflow should clear once',
	async t => {
		const rows = 6;
		const stdout = createTtyStdout();
		stdout.rows = rows;
		const writes = captureWrites(stdout);

		function ResizeBoundaryTestComponent() {
			return (
				<Box height={rows} flexDirection="column">
					<Text>#450 top</Text>
					<Box flexGrow={1}>
						<Text>#450 middle</Text>
					</Box>
					<Text>#450 bottom</Text>
				</Box>
			);
		}

		const {unmount} = render(<ResizeBoundaryTestComponent />, {stdout});

		writes.length = 0;
		stdout.rows = rows - 1;
		stdout.emit('resize');
		await delay(0);

		const {clearTerminalCount} = getIssue450ControlSequenceCounts(
			writes.join(''),
		);
		t.is(clearTerminalCount, 1);

		unmount();
	},
);

test.serial(
	'#450: non-TTY grow-to-overflow rerender should not clear terminal',
	async t => {
		const output = await runNonTtyFixture(
			'issue-450-grow-to-overflow-rerender',
			['3'],
		);
		t.false(output.includes(ansiEscapes.clearTerminal));
	},
);

test.serial('#725: non-TTY child process output is flushed', async t => {
	const output = await runNonTtyFixture('issue-725-child-process');
	const plainOutput = stripAnsi(output);

	t.true(plainOutput.includes('ready-stdin-not-tty'));
	t.true(plainOutput.includes('exited'));
});

test.serial(
	'#450: full-height rerenders with <Static> should not repeatedly clear terminal',
	async t => {
		const {output, clearTerminalCount, eraseLineCount} =
			await runIssue450FixtureWithCounts(
				'issue-450-full-height-with-static-rerender',
			);

		t.true(
			output.includes('#450 static line'),
			'Fixture should emit static output',
		);
		assertIssue450DynamicFrameOutput(t, output);
		t.true(
			clearTerminalCount <= 1,
			`Expected at most one clearTerminal sequence, received ${clearTerminalCount}`,
		);
		t.true(
			eraseLineCount > 0,
			'Expected incremental erase sequences for fullscreen rerenders',
		);
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

test.serial(
	'should reject waitUntilExit when app exits during synchronous render error handling',
	async t => {
		const stdout = createStdout();
		const {waitUntilExit} = render(<ThrowingComponentWithBoundary />, {
			stdout,
			patchConsole: false,
		});

		await t.throwsAsync(
			Promise.race([
				waitUntilExit(),
				delay(500).then(() => {
					throw new Error('waitUntilExit did not settle');
				}),
			]),
			{
				message: 'Synchronous render error',
			},
		);
	},
);

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

test.serial(
	'createDelayedWriteCallbackStdout delays only the first matching chunk',
	async t => {
		let delayCount = 0;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return !isWriteBarrierChunk(chunk);
			},
			onDelayElapsed() {
				delayCount++;
			},
			delayMs: 80,
		});

		const writeChunk = async (chunk: string | Uint8Array): Promise<void> =>
			new Promise<void>(resolve => {
				stdout.write(chunk, () => {
					resolve();
				});
			});

		await writeChunk('');
		t.is(delayCount, 0);

		let didDelayedWriteResolve = false;
		const delayedWritePromise = (async () => {
			await writeChunk('Hello');
			didDelayedWriteResolve = true;
		})();

		await delay(20);
		t.false(didDelayedWriteResolve);
		await delayedWritePromise;
		t.is(delayCount, 1);

		let didImmediateWriteResolve = false;
		const immediateWritePromise = (async () => {
			await writeChunk('World');
			didImmediateWriteResolve = true;
		})();

		await delay(0);
		t.true(didImmediateWriteResolve);
		await immediateWritePromise;
		t.is(delayCount, 1);
	},
);

test.serial(
	'waitUntilRenderFlush resolves after stdout write callback',
	async t => {
		let didInitialWriteCallbackFire = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return !isWriteBarrierChunk(chunk);
			},
			onDelayElapsed() {
				didInitialWriteCallbackFire = true;
			},
		});

		const {unmount, waitUntilExit, waitUntilRenderFlush} = render(
			<Text>Hello</Text>,
			{
				stdout,
			},
		);

		t.teardown(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();

		t.true(didInitialWriteCallbackFire);
	},
);

test.serial(
	'waitUntilRenderFlush flushes pending throttled render',
	async t => {
		const stdout = createStdout();
		const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
			<ThrottleTestComponent text="Hello" />,
			{
				stdout,
				maxFps: 1,
			},
		);

		t.teardown(async () => {
			unmount();
			await waitUntilExit();
		});

		t.is((stdout.write as any).callCount, 1);

		rerender(<ThrottleTestComponent text="World" />);
		t.is((stdout.write as any).callCount, 1);

		await waitUntilRenderFlush();

		t.is((stdout.write as any).callCount, 2);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'World\n',
		);
	},
);

test.serial(
	'waitUntilRenderFlush resolves when stdout is not writable',
	async t => {
		const stdout = createStdout();
		const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
			<ThrottleTestComponent text="Hello" />,
			{
				stdout,
				maxFps: 1,
			},
		);

		t.teardown(async () => {
			unmount();
			await waitUntilExit();
		});

		t.is((stdout.write as any).callCount, 1);

		rerender(<ThrottleTestComponent text="World" />);
		t.is((stdout.write as any).callCount, 1);

		(stdout as NodeJS.WriteStream & {writable?: boolean}).writable = false;
		await waitUntilRenderFlush();

		t.is((stdout.write as any).callCount, 1);
	},
);

test.serial(
	'waitUntilRenderFlush waits for rerender write callback',
	async t => {
		let didSecondWriteCallbackFire = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return (
					!isWriteBarrierChunk(chunk) &&
					toRenderedChunk(chunk).includes('World')
				);
			},
			onDelayElapsed() {
				didSecondWriteCallbackFire = true;
			},
		});

		const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
			<Text>Hello</Text>,
			{stdout},
		);

		t.teardown(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();
		rerender(<Text>World</Text>);
		await waitUntilRenderFlush();

		t.true(didSecondWriteCallbackFire);
	},
);

test.serial(
	'waitUntilRenderFlush waits for concurrent rerender commit',
	async t => {
		let renderedOutput = '';

		const stdout = new Writable({
			write(
				chunk: string | Uint8Array,
				_encoding: BufferEncoding,
				callback: (error?: Error) => void,
			) {
				renderedOutput += toRenderedChunk(chunk);
				callback();
			},
		}) as unknown as NodeJS.WriteStream;

		stdout.columns = 100;

		const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
			<Text>Hello</Text>,
			{
				stdout,
				concurrent: true,
			},
		);

		t.teardown(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();
		rerender(<Text>World</Text>);
		await waitUntilRenderFlush();

		t.true(renderedOutput.includes('World'));
	},
);

test.serial(
	'waitUntilRenderFlush waits for all concurrent waiters on the same rerender',
	async t => {
		let didWorldWriteCallbackFire = false;
		let didAnyWaiterResolveBeforeWorldWriteCallback = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return (
					!isWriteBarrierChunk(chunk) &&
					toRenderedChunk(chunk).includes('World')
				);
			},
			onDelayElapsed() {
				didWorldWriteCallbackFire = true;
			},
		});

		const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
			<Text>Hello</Text>,
			{stdout},
		);

		t.teardown(async () => {
			unmount();
			await waitUntilExit();
		});

		await waitUntilRenderFlush();
		rerender(<Text>World</Text>);

		const waitForFlush = async () => {
			await waitUntilRenderFlush();

			if (!didWorldWriteCallbackFire) {
				didAnyWaiterResolveBeforeWorldWriteCallback = true;
			}
		};

		await Promise.all([waitForFlush(), waitForFlush()]);

		t.true(didWorldWriteCallbackFire);
		t.false(didAnyWaiterResolveBeforeWorldWriteCallback);
	},
);

test.serial(
	'useApp waitUntilRenderFlush resolves after the first frame write callback',
	async t => {
		let didInitialWriteCallbackFire = false;
		let didWaitUntilRenderFlushResolve = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return !isWriteBarrierChunk(chunk);
			},
			onDelayElapsed() {
				didInitialWriteCallbackFire = true;
			},
		});

		function Test() {
			const {exit, waitUntilRenderFlush} = useApp();

			useEffect(() => {
				void (async () => {
					await waitUntilRenderFlush();
					didWaitUntilRenderFlushResolve = true;
					exit();
				})();
			}, [exit, waitUntilRenderFlush]);

			return <Text>Hello</Text>;
		}

		const {waitUntilExit} = render(<Test />, {stdout});
		await waitUntilExit();

		t.true(didInitialWriteCallbackFire);
		t.true(didWaitUntilRenderFlushResolve);
	},
);

test.serial(
	'useApp waitUntilRenderFlush waits for state update frame flush',
	async t => {
		let didWorldWriteCallbackFire = false;
		let didWaitUntilRenderFlushResolve = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return (
					!isWriteBarrierChunk(chunk) &&
					toRenderedChunk(chunk).includes('World')
				);
			},
			onDelayElapsed() {
				didWorldWriteCallbackFire = true;
			},
		});

		function Test() {
			const {exit, waitUntilRenderFlush} = useApp();
			const [text, setText] = useState('Hello');

			useEffect(() => {
				setText('World');
			}, []);

			useEffect(() => {
				if (text !== 'World') {
					return;
				}

				void (async () => {
					await waitUntilRenderFlush();
					didWaitUntilRenderFlushResolve = true;
					exit();
				})();
			}, [exit, text, waitUntilRenderFlush]);

			return <Text>{text}</Text>;
		}

		const {waitUntilExit} = render(<Test />, {stdout});
		await waitUntilExit();

		t.true(didWorldWriteCallbackFire);
		t.true(didWaitUntilRenderFlushResolve);
	},
);

test.serial(
	'useApp waitUntilRenderFlush waits for state update queued in same effect tick',
	async t => {
		let didWorldWriteCallbackFire = false;
		let didWaitUntilRenderFlushResolveBeforeWorldWrite = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return (
					!isWriteBarrierChunk(chunk) &&
					toRenderedChunk(chunk).includes('World')
				);
			},
			onDelayElapsed() {
				didWorldWriteCallbackFire = true;
			},
		});

		function Test() {
			const {exit, waitUntilRenderFlush} = useApp();
			const [text, setText] = useState('Hello');

			useEffect(() => {
				void (async () => {
					setText('World');
					await waitUntilRenderFlush();

					if (!didWorldWriteCallbackFire) {
						didWaitUntilRenderFlushResolveBeforeWorldWrite = true;
					}

					exit();
				})();
			}, [exit, waitUntilRenderFlush]);

			return <Text>{text}</Text>;
		}

		const {waitUntilExit} = render(<Test />, {
			stdout,
			concurrent: true,
		});
		await waitUntilExit();

		t.true(didWorldWriteCallbackFire);
		t.false(didWaitUntilRenderFlushResolveBeforeWorldWrite);
	},
);

test.serial('waitUntilRenderFlush resolves after unmount', async t => {
	const stdout = createStdout();
	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(
		<Text>Hello</Text>,
		{
			stdout,
		},
	);

	unmount();
	await waitUntilExit();
	await waitUntilRenderFlush();
	t.pass();
});

test.serial(
	'waitUntilRenderFlush waits for unmount write callback',
	async t => {
		let didUnmountWriteCallbackFire = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return isWriteBarrierChunk(chunk);
			},
			onDelayElapsed() {
				didUnmountWriteCallbackFire = true;
			},
		});

		const {unmount, waitUntilRenderFlush} = render(<Text>Hello</Text>, {
			stdout,
		});

		unmount();
		await waitUntilRenderFlush();

		t.true(didUnmountWriteCallbackFire);
	},
);

test.serial(
	'waitUntilRenderFlush after unmount does not register beforeExit listener',
	async t => {
		const stdout = createStdout();
		const {unmount, waitUntilRenderFlush} = render(<Text>Hello</Text>, {
			stdout,
		});
		const beforeWaitListenerCount = process.listenerCount('beforeExit');

		unmount();
		await waitUntilRenderFlush();

		t.is(process.listenerCount('beforeExit'), beforeWaitListenerCount);
	},
);

test.serial('waitUntilRenderFlush resolves after exit with error', async t => {
	const stdout = createStdout();

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			exit(new Error('boom'));
		}, []);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit, waitUntilRenderFlush} = render(<Test />, {stdout});

	// Verify exit rejects with the error.
	await t.throwsAsync(waitUntilExit(), {message: 'boom'});

	// Flush must resolve (not reject) even after an error exit.
	await waitUntilRenderFlush();
});

test.serial(
	'issue 596: useEffect can run before the first frame write callback',
	async t => {
		let didInitialWriteCallbackFire = false;
		let didUseEffectRun = false;

		const stdout = createDelayedWriteCallbackStdout({
			shouldDelay(chunk) {
				return !isWriteBarrierChunk(chunk);
			},
			onDelayElapsed() {
				didInitialWriteCallbackFire = true;
			},
		});

		function Test() {
			useEffect(() => {
				didUseEffectRun = true;
			}, []);

			return <Text>Hello</Text>;
		}

		const {unmount, waitUntilExit} = render(<Test />, {stdout});

		await delay(20);
		t.true(didUseEffectRun);
		t.false(didInitialWriteCallbackFire);

		unmount();
		await waitUntilExit();

		t.true(didInitialWriteCallbackFire);
	},
);

test.serial(
	'waitUntilExit resolves first exit value when duplicate exits happen during teardown',
	async t => {
		let barrierWriteCallback: (() => void) | undefined;

		const stdout = new Writable({
			write(
				chunk: string | Uint8Array,
				_encoding: BufferEncoding,
				callback: (error?: Error) => void,
			) {
				if (isWriteBarrierChunk(chunk)) {
					barrierWriteCallback = callback;
					return;
				}

				callback();
			},
		}) as unknown as NodeJS.WriteStream;

		stdout.columns = 100;

		function Test() {
			const {exit} = useApp();

			useEffect(() => {
				exit('first');
				setTimeout(() => {
					exit('second');
				}, 0);
			}, []);

			return <Text>Hello</Text>;
		}

		const {waitUntilExit} = render(<Test />, {stdout});
		const exitPromise = waitUntilExit();

		await delay(0);

		if (!barrierWriteCallback) {
			t.fail('Expected unmount to queue a write barrier callback');
			return;
		}

		barrierWriteCallback();
		const result = await exitPromise;
		t.is(result, 'first');
	},
);

test.serial(
	'waitUntilExit resolves first exit value when exit is re-entered during unmount writes',
	async t => {
		let exit: ((errorOrResult?: unknown) => void) | undefined;
		let shouldReenterExit = false;
		let didReenterExit = false;

		const stdout = new Writable({
			write(_chunk, _encoding, callback) {
				if (shouldReenterExit && !didReenterExit && exit) {
					didReenterExit = true;
					exit('second');
				}

				callback();
			},
		}) as unknown as NodeJS.WriteStream;

		stdout.columns = 100;
		stdout.isTTY = true;

		function Test() {
			const {exit: appExit} = useApp();

			useEffect(() => {
				exit = appExit;
				shouldReenterExit = true;
				appExit('first');
			}, []);

			return <Text>Hello</Text>;
		}

		const {waitUntilExit} = render(<Test />, {stdout});
		const result = await waitUntilExit();

		t.true(didReenterExit);
		t.is(result, 'first');
	},
);

test.serial(
	'waitUntilExit resolves first exit value when exit is re-entered during unmount writes in debug mode',
	async t => {
		let exit: ((errorOrResult?: unknown) => void) | undefined;
		let shouldReenterExit = false;
		let didReenterExit = false;

		const stdout = new Writable({
			write(_chunk, _encoding, callback) {
				if (shouldReenterExit && !didReenterExit && exit) {
					didReenterExit = true;
					exit('second');
				}

				callback();
			},
		}) as unknown as NodeJS.WriteStream;

		stdout.columns = 100;
		stdout.isTTY = true;

		function Test() {
			const {exit: appExit} = useApp();

			useEffect(() => {
				exit = appExit;
				shouldReenterExit = true;
				appExit('first');
			}, []);

			return <Text>Hello</Text>;
		}

		const {waitUntilExit} = render(<Test />, {stdout, debug: true});
		const result = await waitUntilExit();

		t.true(didReenterExit);
		t.is(result, 'first');
	},
);

test.serial(
	'waitUntilExit resolves first exit value when exit is re-entered during unmount writes with screen reader',
	async t => {
		let exit: ((errorOrResult?: unknown) => void) | undefined;
		let shouldReenterExit = false;
		let didReenterExit = false;

		const stdout = new Writable({
			write(_chunk, _encoding, callback) {
				if (shouldReenterExit && !didReenterExit && exit) {
					didReenterExit = true;
					exit('second');
				}

				callback();
			},
		}) as unknown as NodeJS.WriteStream;

		stdout.columns = 100;
		stdout.isTTY = true;

		function Test() {
			const {exit: appExit} = useApp();

			useEffect(() => {
				exit = appExit;
				shouldReenterExit = true;
				appExit('first');
			}, []);

			return <Text>Hello</Text>;
		}

		const {waitUntilExit} = render(<Test />, {
			stdout,
			isScreenReaderEnabled: true,
			patchConsole: false,
		});
		const result = await waitUntilExit();

		t.true(didReenterExit);
		t.is(result, 'first');
	},
);

test.serial('exit rejects on cross-realm Error', async t => {
	const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
	stdout.columns = 100;

	const foreignError = vm.runInNewContext(`new Error('boom')`) as Error;

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			setTimeout(() => {
				exit(foreignError);
			}, 0);
		}, []);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout, patchConsole: false});

	await t.throwsAsync(waitUntilExit(), {
		message: 'boom',
	});
});

test.serial(
	'exit with cross-realm Error rejects after stdout write callback',
	async t => {
		let writeCallbackFired = false;
		let barrierWriteCallbackFired = false;

		const stdout = new Writable({
			write(chunk: string | Uint8Array, _encoding, callback) {
				setTimeout(() => {
					writeCallbackFired = true;

					if (isWriteBarrierChunk(chunk)) {
						barrierWriteCallbackFired = true;
					}

					callback();
				}, 150);
			},
		}) as unknown as NodeJS.WriteStream;

		stdout.columns = 100;

		const foreignError = vm.runInNewContext(`new Error('boom')`) as Error;

		function Test() {
			const {exit} = useApp();

			useEffect(() => {
				setTimeout(() => {
					exit(foreignError);
				}, 0);
			}, []);

			return <Text>Hello</Text>;
		}

		const {waitUntilExit} = render(<Test />, {stdout, patchConsole: false});

		await t.throwsAsync(waitUntilExit(), {
			message: 'boom',
		});

		t.true(writeCallbackFired);
		t.true(barrierWriteCallbackFired);
	},
);

test.serial('unmount does not write to ended stdout stream', async t => {
	const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
	stdout.columns = 100;

	const writeErrors: Error[] = [];
	stdout.on('error', error => {
		writeErrors.push(error);
	});

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {stdout});
	const exitPromise = waitUntilExit();

	stdout.end();
	unmount();
	await exitPromise;
	await delay(0);

	t.false(
		writeErrors.some(
			error =>
				(error as NodeJS.ErrnoException).code === 'ERR_STREAM_WRITE_AFTER_END',
		),
	);
});

test.serial(
	'unmount cancels pending throttled log writes when stdout is ended',
	t => {
		const clock = FakeTimers.install();
		try {
			const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
			stdout.columns = 100;

			const writeErrors: Error[] = [];
			stdout.on('error', error => {
				writeErrors.push(error);
			});

			const {rerender, unmount} = render(
				<ThrottleTestComponent text="Hello" />,
				{
					stdout,
					maxFps: 1,
				},
			);

			rerender(<ThrottleTestComponent text="World" />);
			stdout.end();
			unmount();
			clock.tick(1000);

			t.false(
				writeErrors.some(
					error =>
						(error as NodeJS.ErrnoException).code ===
						'ERR_STREAM_WRITE_AFTER_END',
				),
			);
		} finally {
			clock.uninstall();
		}
	},
);

test.serial(
	'unmount cancels pending throttled render when stdout is ended',
	t => {
		const clock = FakeTimers.install();
		try {
			const baselineStdout = new PassThrough() as unknown as NodeJS.WriteStream;
			baselineStdout.columns = 100;

			const baselineApp = render(<ThrottleTestComponent text="Hello" />, {
				stdout: baselineStdout,
				maxFps: 1,
			});
			baselineStdout.end();
			baselineApp.unmount();
			const baselineTimers = clock.countTimers();
			clock.runAll();

			const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
			stdout.columns = 100;

			const {rerender, unmount} = render(
				<ThrottleTestComponent text="Hello" />,
				{
					stdout,
					maxFps: 1,
				},
			);
			rerender(<ThrottleTestComponent text="World" />);
			stdout.end();
			unmount();

			t.is(clock.countTimers(), baselineTimers);
		} finally {
			clock.uninstall();
		}
	},
);

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
