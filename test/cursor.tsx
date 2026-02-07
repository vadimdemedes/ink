import EventEmitter from 'node:events';
import {stub} from 'sinon';
import test from 'ava';
import React, {Suspense, act, useEffect, useState} from 'react';
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
import createStdout from './helpers/create-stdout.js';

const showCursorEscape = '\u001B[?25h';
const hideCursorEscape = '\u001B[?25l';

const createStdin = () => {
	const stdin = new EventEmitter() as unknown as NodeJS.WriteStream;
	stdin.isTTY = true;
	stdin.setRawMode = stub();
	stdin.setEncoding = () => {};
	stdin.read = stub();
	stdin.unref = () => {};
	stdin.ref = () => {};

	return stdin;
};

const emitReadable = (stdin: NodeJS.WriteStream, chunk: string) => {
	/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
	const read = stdin.read as ReturnType<typeof stub>;
	read.onCall(0).returns(chunk);
	read.onCall(1).returns(null);
	stdin.emit('readable');
	read.reset();
	/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
};

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

test.serial('cursor remains visible after useStdout().write()', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	function App() {
		const {setCursorPosition} = useCursor();
		const {write} = useStdout();

		setCursorPosition({x: 2, y: 0});

		useEffect(() => {
			write('from stdout hook\n');
		}, [write]);

		return <Text>Hello</Text>;
	}

	const {unmount} = render(<App />, {stdout, stdin});
	await delay(100);

	const output = cursorVisibilityFromStdoutWrites(stdout);
	const lastShowIndex = output.lastIndexOf(showCursorEscape);
	const lastHideIndex = output.lastIndexOf(hideCursorEscape);

	t.true(output.includes('from stdout hook'));
	t.true(
		lastShowIndex > lastHideIndex,
		'last cursor visibility escape should be show after useStdout write',
	);

	unmount();
});

test.serial('cursor remains visible after useStderr().write()', async t => {
	const stdout = createStdout();
	const stderr = createStdout();
	const stdin = createStdin();

	function App() {
		const {setCursorPosition} = useCursor();
		const {write} = useStderr();

		setCursorPosition({x: 2, y: 0});

		useEffect(() => {
			write('from stderr hook\n');
		}, [write]);

		return <Text>Hello</Text>;
	}

	const {unmount} = render(<App />, {stdout, stderr, stdin});
	await delay(100);

	const output = cursorVisibilityFromStdoutWrites(stdout);
	const lastShowIndex = output.lastIndexOf(showCursorEscape);
	const lastHideIndex = output.lastIndexOf(hideCursorEscape);

	t.true((stderr.write as any).called);
	t.true(
		lastShowIndex > lastHideIndex,
		'last cursor visibility escape should be show after useStderr write',
	);

	unmount();
});
