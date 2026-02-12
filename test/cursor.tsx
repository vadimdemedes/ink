import test, {type ExecutionContext} from 'ava';
import React, {Suspense, act, useEffect, useRef, useState} from 'react';
import ansiEscapes from 'ansi-escapes';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import {
	render,
	Box,
	Cursor,
	Text,
	type DOMElement,
	useInput,
	useCursor,
	useStdout,
	useStderr,
} from '../src/index.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import createStdout from './helpers/create-stdout.js';

const showCursorEscape = '\u001B[?25h';
const hideCursorEscape = '\u001B[?25l';

function InputApp() {
	const [text, setText] = useState('');
	const {setCursorPosition} = useCursor();

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(prev => prev.slice(0, -1));
			return;
		}

		if (!key.ctrl && !key.meta && input) {
			setText(prev => prev + input);
		}
	});

	setCursorPosition({x: 2 + text.length, y: 0});

	return (
		<Box>
			<Text>{`> ${text}`}</Text>
		</Box>
	);
}

function CursorComponentApp() {
	const [text, setText] = useState('');

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(previousText => previousText.slice(0, -1));
			return;
		}

		if (!key.ctrl && !key.meta && input) {
			setText(previousText => previousText + input);
		}
	});

	return (
		<Box flexDirection="column">
			<Text>Type:</Text>
			<Box>
				<Text>{`> ${text}`}</Text>
				<Cursor x={2 + text.length} />
			</Box>
		</Box>
	);
}

function CursorAnchorRefApp() {
	const [text, setText] = useState('');
	const lineReference = useRef<DOMElement>(null);

	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setText(previousText => previousText.slice(0, -1));
			return;
		}

		if (!key.ctrl && !key.meta && input) {
			setText(previousText => previousText + input);
		}
	});

	return (
		<Box flexDirection="column">
			<Text>Type:</Text>
			<Box ref={lineReference}>
				<Text>{`> ${text}`}</Text>
			</Box>
			<Cursor anchorRef={lineReference} x={2 + text.length} />
		</Box>
	);
}

function UnresolvedCursorAnchorApp() {
	const missingReference = useRef<DOMElement>(null);

	return (
		<Box>
			<Text>Hello</Text>
			<Cursor anchorRef={missingReference} x={1} />
		</Box>
	);
}

function MultipleCursorApp() {
	return (
		<Box>
			<Text>{'> hi'}</Text>
			<Cursor x={1} />
			<Cursor x={4} />
		</Box>
	);
}

function CursorFallbackApp() {
	const [showCursorComponent, setShowCursorComponent] = useState(true);
	const {setCursorPosition} = useCursor();

	useInput((_input, key) => {
		if (key.return) {
			setShowCursorComponent(false);
		}
	});

	setCursorPosition({x: 1, y: 0});

	return (
		<Box>
			<Text>{'> hi'}</Text>
			{showCursorComponent ? <Cursor x={4} /> : undefined}
		</Box>
	);
}

function LayoutWithoutCursorApp() {
	return (
		<Box flexDirection="column">
			<Text>Type:</Text>
			<Box>
				<Text>{'> hi'}</Text>
			</Box>
		</Box>
	);
}

function LayoutWithCursorApp() {
	return (
		<Box flexDirection="column">
			<Text>Type:</Text>
			<Box>
				<Text>{'> hi'}</Text>
				<Cursor x={4} />
			</Box>
		</Box>
	);
}

test.serial('cursor is shown at specified position after render', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<InputApp />, {stdout, stdin});
	await delay(100);

	const firstWrite = (stdout.write as any).firstCall.args[0] as string;
	// Cursor should be shown at x=2 (after "> ")
	t.true(
		firstWrite.includes(showCursorEscape),
		'cursor should be visible after first render',
	);
	t.true(
		firstWrite.includes(ansiEscapes.cursorTo(2)),
		'cursor should be at column 2',
	);

	unmount();
});

test.serial(
	'<Cursor /> positions cursor relative to parent content origin',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		const {unmount} = render(<CursorComponentApp />, {stdout, stdin});
		await delay(100);

		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.true(firstWrite.includes(showCursorEscape));
		t.true(
			firstWrite.includes(ansiEscapes.cursorTo(2)),
			'cursor should start at prompt end',
		);
		t.true(
			firstWrite.includes(ansiEscapes.cursorUp(1)),
			'cursor should be on the second rendered line',
		);

		emitReadable(stdin, 'a');
		await delay(100);
		t.true(
			stdout.get().includes(ansiEscapes.cursorTo(3)),
			'cursor should move when text changes',
		);

		unmount();
	},
);

test.serial('<Cursor anchorRef /> anchors to referenced element', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<CursorAnchorRefApp />, {stdout, stdin});
	await delay(100);

	const firstWrite = (stdout.write as any).firstCall.args[0] as string;
	t.true(firstWrite.includes(showCursorEscape));
	t.true(
		firstWrite.includes(ansiEscapes.cursorTo(2)),
		'cursor should start at prompt end',
	);
	t.true(
		firstWrite.includes(ansiEscapes.cursorUp(1)),
		'cursor should anchor to referenced second line',
	);

	emitReadable(stdin, 'a');
	await delay(100);
	t.true(
		stdout.get().includes(ansiEscapes.cursorTo(3)),
		'cursor should move when referenced text changes',
	);

	unmount();
});

test.serial(
	'<Cursor anchorRef /> hides cursor when anchor cannot be resolved',
	async t => {
		const stdout = createStdout();

		const {unmount} = render(<UnresolvedCursorAnchorApp />, {stdout});
		await delay(100);

		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.false(
			firstWrite.includes(showCursorEscape),
			'cursor should stay hidden when anchor is unresolved',
		);

		unmount();
	},
);

test.serial(
	'<Cursor anchorRef /> treats hidden suspense anchor as unresolved',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		let resolvePromise: () => void;
		const promise = new Promise<void>(resolve => {
			resolvePromise = resolve;
		});

		let didSuspend = false;

		function AnchorTarget({
			suspend,
			anchorReference,
		}: {
			readonly suspend: boolean;
			readonly anchorReference: React.RefObject<DOMElement>;
		}) {
			if (suspend && !didSuspend) {
				didSuspend = true;
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw promise;
			}

			return (
				<Box ref={anchorReference}>
					<Text>target</Text>
				</Box>
			);
		}

		function Test({suspend}: {readonly suspend: boolean}) {
			const anchorReference = useRef<DOMElement>(null);

			return (
				<Box flexDirection="column">
					<Suspense fallback={<Text>loading</Text>}>
						<AnchorTarget suspend={suspend} anchorReference={anchorReference} />
					</Suspense>
					<Cursor anchorRef={anchorReference} x={1} />
				</Box>
			);
		}

		const app = render(<Test suspend={false} />, {
			stdout,
			stdin,
			concurrent: true,
		});
		const stdoutWriteSpy = stdout.write as unknown as {
			callCount: number;
			getCall: (callIndex: number) => {
				args: unknown[];
			};
		};
		await delay(100);

		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.true(
			firstWrite.includes(showCursorEscape),
			'initial render should show cursor with resolved anchor',
		);

		const callCountBeforeSuspend = stdoutWriteSpy.callCount;

		app.rerender(<Test suspend />);
		await delay(100);

		const suspenseWrites: string[] = [];
		for (
			let callIndex = callCountBeforeSuspend;
			callIndex < stdoutWriteSpy.callCount;
			callIndex++
		) {
			suspenseWrites.push(stdoutWriteSpy.getCall(callIndex).args[0] as string);
		}

		const suspenseOutput = suspenseWrites.join('');
		t.true(suspenseOutput.includes('loading'), 'fallback should render');

		const hasShowCursor = suspenseWrites.some(write =>
			write.includes(showCursorEscape),
		);
		t.false(
			hasShowCursor,
			'fallback should hide cursor when anchored node is hidden',
		);

		resolvePromise!();
		await act(async () => {
			await delay(50);
		});
		app.unmount();
	},
);

test.serial(
	'<Cursor anchorRef /> treats display:none anchor as unresolved',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		function Test({hidden}: {readonly hidden: boolean}) {
			const anchorReference = useRef<DOMElement>(null);

			return (
				<Box flexDirection="column">
					<Box ref={anchorReference} display={hidden ? 'none' : 'flex'}>
						<Text>target</Text>
					</Box>
					<Text>footer</Text>
					<Cursor anchorRef={anchorReference} x={1} />
				</Box>
			);
		}

		const app = render(<Test hidden={false} />, {stdout, stdin});
		const stdoutWriteSpy = stdout.write as unknown as {
			callCount: number;
			getCall: (callIndex: number) => {
				args: unknown[];
			};
		};
		await delay(100);

		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.true(
			firstWrite.includes(showCursorEscape),
			'initial render should show cursor with resolved anchor',
		);

		const callCountBeforeHide = stdoutWriteSpy.callCount;

		app.rerender(<Test hidden />);
		await delay(100);

		const hiddenWrites: string[] = [];
		for (
			let callIndex = callCountBeforeHide;
			callIndex < stdoutWriteSpy.callCount;
			callIndex++
		) {
			hiddenWrites.push(stdoutWriteSpy.getCall(callIndex).args[0] as string);
		}

		t.true(hiddenWrites.length > 0, 'rerender should produce output updates');
		const hasShowCursor = hiddenWrites.some(write =>
			write.includes(showCursorEscape),
		);
		t.false(
			hasShowCursor,
			'cursor should be hidden when anchor uses display:none',
		);

		app.unmount();
	},
);

test.serial(
	'<Cursor anchorRef /> treats hidden ancestor as unresolved',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		function Test({hidden}: {readonly hidden: boolean}) {
			const anchorReference = useRef<DOMElement>(null);

			return (
				<Box flexDirection="column">
					<Box display={hidden ? 'none' : 'flex'}>
						<Box ref={anchorReference}>
							<Text>target</Text>
						</Box>
					</Box>
					<Text>footer</Text>
					<Cursor anchorRef={anchorReference} x={1} />
				</Box>
			);
		}

		const app = render(<Test hidden={false} />, {stdout, stdin});
		const stdoutWriteSpy = stdout.write as unknown as {
			callCount: number;
			getCall: (callIndex: number) => {
				args: unknown[];
			};
		};
		await delay(100);

		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.true(
			firstWrite.includes(showCursorEscape),
			'initial render should show cursor with resolved anchor',
		);

		const callCountBeforeHide = stdoutWriteSpy.callCount;

		app.rerender(<Test hidden />);
		await delay(100);

		const hiddenWrites: string[] = [];
		for (
			let callIndex = callCountBeforeHide;
			callIndex < stdoutWriteSpy.callCount;
			callIndex++
		) {
			hiddenWrites.push(stdoutWriteSpy.getCall(callIndex).args[0] as string);
		}

		t.true(hiddenWrites.length > 0, 'rerender should produce output updates');
		const hasShowCursor = hiddenWrites.some(write =>
			write.includes(showCursorEscape),
		);
		t.false(
			hasShowCursor,
			'cursor should be hidden when anchor ancestor uses display:none',
		);

		app.unmount();
	},
);

test.serial(
	'last rendered <Cursor /> wins when multiple cursors are rendered',
	async t => {
		const stdout = createStdout();

		const {unmount} = render(<MultipleCursorApp />, {stdout});
		await delay(100);

		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.true(
			firstWrite.endsWith(ansiEscapes.cursorTo(4) + showCursorEscape),
			'last cursor should control final cursor position',
		);

		unmount();
	},
);

test.serial(
	'falls back to useCursor position after <Cursor /> unmounts',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		const {unmount} = render(<CursorFallbackApp />, {stdout, stdin});
		await delay(100);

		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.true(
			firstWrite.endsWith(ansiEscapes.cursorTo(4) + showCursorEscape),
			'component cursor should win while mounted',
		);

		emitReadable(stdin, '\r');
		await delay(100);

		const lastWrite = stdout.get();
		t.true(
			lastWrite.includes(ansiEscapes.cursorTo(1)),
			'should fall back to manual useCursor position',
		);

		unmount();
	},
);

test.serial('<Cursor /> does not affect layout output', async t => {
	const stdoutWithoutCursor = createStdout();
	const stdoutWithCursor = createStdout();

	const {unmount: unmountWithoutCursor} = render(<LayoutWithoutCursorApp />, {
		stdout: stdoutWithoutCursor,
		debug: true,
	});
	const {unmount: unmountWithCursor} = render(<LayoutWithCursorApp />, {
		stdout: stdoutWithCursor,
		debug: true,
	});
	await delay(100);

	const outputWithoutCursor = stripAnsi(stdoutWithoutCursor.get());
	const outputWithCursor = stripAnsi(stdoutWithCursor.get());
	t.is(outputWithCursor, outputWithoutCursor);

	unmountWithoutCursor();
	unmountWithCursor();
});

test.serial('cursor is not hidden by useEffect after first render', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<InputApp />, {stdout, stdin});
	await delay(100);

	// Check all writes after the first render — none should be a bare hideCursorEscape
	// that would undo the showCursorEscape from log-update.
	// The last write to stdout should contain showCursorEscape (from log-update),
	// not be followed by a separate hideCursorEscape write from App.tsx useEffect.
	const allWrites: string[] = [];
	for (let i = 0; i < (stdout.write as any).callCount; i++) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		allWrites.push((stdout.write as any).getCall(i).args[0] as string);
	}

	// The last escape sequence affecting cursor visibility should be showCursorEscape
	const lastVisibilityChange = allWrites.findLast(
		w => w.includes(showCursorEscape) || w === hideCursorEscape,
	);

	t.true(
		lastVisibilityChange?.includes(showCursorEscape) ?? false,
		'last cursor visibility change should be SHOW, not HIDE',
	);

	unmount();
});

test.serial('cursor follows text input', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<InputApp />, {stdout, stdin});
	await delay(100);

	emitReadable(stdin, 'a');
	await delay(100);

	const lastWrite = stdout.get();
	// After typing 'a', cursor should be at x=3 ("> a" = 3 chars)
	t.true(lastWrite.includes(showCursorEscape));
	t.true(
		lastWrite.includes(ansiEscapes.cursorTo(3)),
		'cursor should move to column 3 after typing "a"',
	);

	unmount();
});

test.serial(
	'cursor moves on space input even when output is identical',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		const {unmount} = render(<InputApp />, {stdout, stdin});
		await delay(100);

		emitReadable(stdin, 'a');
		await delay(100);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const afterA = (stdout.write as any).callCount;

		emitReadable(stdin, ' ');
		await delay(100);

		// Space adds to text, cursor should move even if Ink output looks the same (padded)
		t.true(
			(stdout.write as any).callCount > afterA,
			'should write to stdout after space input',
		);

		const lastWrite = stdout.get();
		// After "a ", cursor should be at x=4
		t.true(
			lastWrite.includes(ansiEscapes.cursorTo(4)),
			'cursor should be at column 4 after "a "',
		);

		unmount();
	},
);

test.serial(
	'cursor is cleared when component using useCursor unmounts',
	async t => {
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
		await delay(100);

		// Cursor should be shown after first render
		const firstWrite = (stdout.write as any).firstCall.args[0] as string;
		t.true(
			firstWrite.includes(showCursorEscape),
			'cursor should be visible initially',
		);

		// Unmount the child by pressing Enter
		emitReadable(stdin, '\r');
		await delay(100);

		// After child unmounts, cursor position should be cleared.
		// The last write should NOT contain showCursorEscape.
		const allWrites: string[] = [];
		for (let i = 0; i < (stdout.write as any).callCount; i++) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			allWrites.push((stdout.write as any).getCall(i).args[0] as string);
		}

		const lastWrite = allWrites.at(-1) ?? '';
		t.false(
			lastWrite.includes(showCursorEscape),
			'cursor should not be shown after child with useCursor unmounts',
		);

		unmount();
	},
);

test.serial(
	'cursor position does not leak from suspended concurrent render to fallback',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		let resolvePromise: () => void;
		const promise = new Promise<void>(resolve => {
			resolvePromise = resolve;
		});

		let suspended = true;

		function CursorChild() {
			const {setCursorPosition} = useCursor();
			setCursorPosition({x: 5, y: 0}); // Render-phase side effect
			if (suspended) {
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

		// Collect all writes during fallback render
		const allWrites: string[] = [];
		for (let i = 0; i < (stdout.write as any).callCount; i++) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			allWrites.push((stdout.write as any).getCall(i).args[0] as string);
		}

		// Fallback should NOT contain showCursorEscape from the suspended render
		const hasShowCursor = allWrites.some(w => w.includes(showCursorEscape));
		t.false(
			hasShowCursor,
			'fallback output should not contain show cursor escape from suspended concurrent render',
		);

		// Cleanup: resolve promise and unmount
		suspended = false;
		resolvePromise!();
		await act(async () => {
			await delay(50);
		});
	},
);

test.serial(
	'cursor marker in hidden concurrent suspense subtree does not affect fallback cursor',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		let resolvePromise: () => void;
		const promise = new Promise<void>(resolve => {
			resolvePromise = resolve;
		});

		let didSuspend = false;

		function CursorChild({suspend}: {readonly suspend: boolean}) {
			if (suspend && !didSuspend) {
				didSuspend = true;
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw promise;
			}

			return (
				<>
					<Text>loaded</Text>
					<Cursor x={5} />
				</>
			);
		}

		function Test({suspend}: {readonly suspend: boolean}) {
			return (
				<Suspense fallback={<Text>loading</Text>}>
					<CursorChild suspend={suspend} />
				</Suspense>
			);
		}

		const app = render(<Test suspend={false} />, {
			stdout,
			stdin,
			concurrent: true,
		});
		const stdoutWriteSpy = stdout.write as unknown as {
			callCount: number;
			getCall: (callIndex: number) => {
				args: unknown[];
			};
		};
		await delay(100);

		const callCountBeforeSuspend = stdoutWriteSpy.callCount;

		app.rerender(<Test suspend />);
		await delay(100);

		const suspenseWrites: string[] = [];
		for (
			let callIndex = callCountBeforeSuspend;
			callIndex < stdoutWriteSpy.callCount;
			callIndex++
		) {
			suspenseWrites.push(stdoutWriteSpy.getCall(callIndex).args[0] as string);
		}

		const suspenseOutput = suspenseWrites.join('');
		t.true(suspenseOutput.includes('loading'), 'fallback should render');

		const hasShowCursor = suspenseWrites.some(write =>
			write.includes(showCursorEscape),
		);
		t.false(
			hasShowCursor,
			'fallback output should not include show cursor escape from hidden cursor marker',
		);

		resolvePromise!();
		await act(async () => {
			await delay(50);
		});
		app.unmount();
	},
);

test.serial('screen does not scroll up on subsequent renders', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	function MultiLineApp() {
		const [text, setText] = useState('');
		const {setCursorPosition} = useCursor();

		useInput((input, key) => {
			if (!key.ctrl && !key.meta && input) {
				setText(prev => prev + input);
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
	await delay(100);

	emitReadable(stdin, 'x');
	await delay(100);

	const secondWrite = stdout.get();
	// When cursor was at y=1 (line 1), next render should first cursorDown to bottom,
	// then erase. The write should contain cursorDown to return to bottom.
	// It should NOT just erase from cursor position (which would scroll screen up).
	t.true(
		secondWrite.includes(hideCursorEscape),
		'should hide cursor before erase',
	);
	// The write should include the new text
	t.true(secondWrite.includes('x'), 'should contain the typed character');

	unmount();
});

const cursorVisibilityFromStdoutWrites = (
	stdout: NodeJS.WriteStream,
): string => {
	const writes: string[] = [];
	for (let i = 0; i < (stdout.write as any).callCount; i++) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		writes.push((stdout.write as any).getCall(i).args[0] as string);
	}

	return writes.join('');
};

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
		t: ExecutionContext,
		output: string,
		stderr: NodeJS.WriteStream | undefined,
	) => void;
};

const hookWriteCases: HookWriteCase[] = [
	{
		testName: 'cursor remains visible after useStdout().write()',
		App: StdoutWriteApp,
		assertTargetWrite(t, output) {
			t.true(output.includes('from stdout hook'));
		},
	},
	{
		testName: 'cursor remains visible after useStderr().write()',
		App: StderrWriteApp,
		includeStderr: true,
		assertTargetWrite(t, _output, stderr) {
			t.true((stderr?.write as any).called);
		},
	},
];

for (const testCase of hookWriteCases) {
	test.serial(testCase.testName, async t => {
		const stdout = createStdout();
		const stdin = createStdin();
		const stderr = testCase.includeStderr ? createStdout() : undefined;

		const {unmount} = render(
			<testCase.App />,
			stderr ? {stdout, stderr, stdin} : {stdout, stdin},
		);
		await delay(100);

		const output = cursorVisibilityFromStdoutWrites(stdout);
		const lastShowIndex = output.lastIndexOf(showCursorEscape);
		const lastHideIndex = output.lastIndexOf(hideCursorEscape);

		testCase.assertTargetWrite(t, output, stderr);
		t.true(
			lastShowIndex > lastHideIndex,
			'last cursor visibility escape should be show after hook write',
		);

		unmount();
	});
}
