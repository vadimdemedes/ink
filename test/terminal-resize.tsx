import process from 'node:process';
import test, {type TestContext} from 'node:test';
import ansiEscapes from 'ansi-escapes';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import React, {useLayoutEffect} from 'react';
import {render, Box, Text, useWindowSize, useCursor} from '../src/index.js';
import {homeAndEraseDown} from '../src/ink.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';
import createStdout, {type FakeStdout} from './helpers/create-stdout.js';

const getWriteContents = (stdout: FakeStdout): string[] =>
	stdout
		.getWrites()
		.filter(
			w =>
				w.length > 0 &&
				!w.startsWith('\u{1B}[?25') &&
				!w.startsWith('\u{1B}[?2026'),
		);

test('useWindowSize catches resizes before its subscription is installed', async (t: TestContext) => {
	const stdout = createStdout(100);
	stdout.rows = 40;
	let initialSize: string | undefined;

	function Test() {
		const {columns, rows} = useWindowSize();
		initialSize ??= `${columns}x${rows}`;

		useLayoutEffect(() => {
			stdout.columns = 60;
			stdout.rows = 20;
			stdout.emit('resize');
		}, []);

		return (
			<Text>
				{columns}x{rows}
			</Text>
		);
	}

	const {unmount, waitUntilRenderFlush} = render(<Test />, {
		stdout,
		debug: true,
	});
	t.after(() => {
		unmount();
	});
	await waitUntilRenderFlush();

	t.assert.strictEqual(initialSize, '100x40');
	t.assert.strictEqual(stdout.get(), '60x20');
});

test('useWindowSize returns current terminal dimensions and updates on resize', async (t: TestContext) => {
	const stdout = createStdout(100);
	(stdout as any).rows = 40;

	function Test() {
		const {columns, rows} = useWindowSize();
		return (
			<Text>
				{columns}x{rows}
			</Text>
		);
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout, interactive: true});
	await waitUntilRenderFlush();

	t.assert.ok(stripAnsi(getWriteContents(stdout).at(-1)!).includes('100x40'));

	(stdout as any).columns = 60;
	(stdout as any).rows = 20;
	stdout.emit('resize');
	await delay(100);

	t.assert.ok(stripAnsi(getWriteContents(stdout).at(-1)!).includes('60x20'));
});

test('useWindowSize removes resize listener on unmount', async (t: TestContext) => {
	const stdout = createStdout(100);
	(stdout as any).rows = 24;

	function Test() {
		const {columns, rows} = useWindowSize();
		return (
			<Text>
				{columns}x{rows}
			</Text>
		);
	}

	const initialListenerCount = stdout.listenerCount('resize');
	const {unmount, waitUntilRenderFlush} = render(<Test />, {stdout});
	await waitUntilRenderFlush();

	t.assert.ok(stdout.listenerCount('resize') > initialListenerCount);
	unmount();

	t.assert.strictEqual(stdout.listenerCount('resize'), initialListenerCount);
});

// eslint-disable-next-line node-test/require-assertion -- Passes when the resize does not throw.
test('useWindowSize does not crash when resize fires after unmount', async () => {
	const stdout = createStdout(100);
	(stdout as any).rows = 24;

	function Test() {
		const {columns, rows} = useWindowSize();
		return (
			<Text>
				{columns}x{rows}
			</Text>
		);
	}

	const {unmount, waitUntilRenderFlush} = render(<Test />, {stdout});
	await waitUntilRenderFlush();
	unmount();

	stdout.emit('resize');
	await delay(50);
});

test('useWindowSize falls back to a positive column count when stdout.columns is 0', async (t: TestContext) => {
	const stdout = createStdout(0);
	let capturedColumns = -1;

	function Test() {
		const {columns} = useWindowSize();
		capturedColumns = columns;
		return <Text>{columns}</Text>;
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout});
	await waitUntilRenderFlush();

	t.assert.ok(capturedColumns > 0);
});

test('useWindowSize falls back to terminal-size rows when stdout.rows is missing', async (t: TestContext) => {
	const stdout = createStdout(0);
	let capturedRows = -1;
	const originalColumns = process.env.COLUMNS;
	const originalLines = process.env.LINES;
	const originalProcessStdoutColumns = process.stdout.columns;
	const originalProcessStdoutRows = process.stdout.rows;
	const originalProcessStderrColumns = process.stderr.columns;
	const originalProcessStderrRows = process.stderr.rows;

	t.after(() => {
		process.env.COLUMNS = originalColumns;
		process.env.LINES = originalLines;
		process.stdout.columns = originalProcessStdoutColumns;
		process.stdout.rows = originalProcessStdoutRows;
		process.stderr.columns = originalProcessStderrColumns;
		process.stderr.rows = originalProcessStderrRows;
	});

	// eslint-disable-next-line node-test/no-process-env-mutation -- Restored in `t.after()`.
	process.env.COLUMNS = '123';
	// eslint-disable-next-line node-test/no-process-env-mutation -- Restored in `t.after()`.
	process.env.LINES = '45';
	process.stdout.columns = 0;
	process.stdout.rows = 0;
	process.stderr.columns = 0;
	process.stderr.rows = 0;
	delete (stdout as any).rows;

	function Test() {
		const {rows} = useWindowSize();
		capturedRows = rows;
		return <Text>{rows}</Text>;
	}

	const {waitUntilRenderFlush} = render(<Test />, {stdout});
	await waitUntilRenderFlush();

	t.assert.strictEqual(capturedRows, 45);
});

for (const isTty of [false, true]) {
	test(`resolve the terminal-size fallback once per stream instead of on every render (isTTY: ${String(isTty)})`, async (t: TestContext) => {
		const stdout = createStdout(0, isTty);
		const originalColumns = process.env.COLUMNS;
		const originalLines = process.env.LINES;
		const originalProcessStdoutColumns = process.stdout.columns;
		const originalProcessStdoutRows = process.stdout.rows;
		const originalProcessStderrColumns = process.stderr.columns;
		const originalProcessStderrRows = process.stderr.rows;

		t.after(() => {
			process.env.COLUMNS = originalColumns;
			process.env.LINES = originalLines;
			process.stdout.columns = originalProcessStdoutColumns;
			process.stdout.rows = originalProcessStdoutRows;
			process.stderr.columns = originalProcessStderrColumns;
			process.stderr.rows = originalProcessStderrRows;
		});

		// eslint-disable-next-line node-test/no-process-env-mutation -- Restored in `t.after()`.
		process.env.COLUMNS = '30';
		// eslint-disable-next-line node-test/no-process-env-mutation -- Restored in `t.after()`.
		process.env.LINES = '10';
		process.stdout.columns = 0;
		process.stdout.rows = 0;
		process.stderr.columns = 0;
		process.stderr.rows = 0;

		function Test({label}: {readonly label: string}) {
			return (
				<Box borderStyle="single">
					<Text>{label}</Text>
				</Box>
			);
		}

		const {rerender, unmount, waitUntilRenderFlush} = render(
			<Test label="first" />,
			{stdout, debug: true},
		);
		await waitUntilRenderFlush();

		// eslint-disable-next-line node-test/no-process-env-mutation -- Restored in `t.after()`.
		process.env.COLUMNS = '50';
		rerender(<Test label="second" />);
		await waitUntilRenderFlush();
		unmount();

		const lastFrame = stripAnsi(
			stdout.getWrites().findLast(write => write.includes('second')) ?? '',
		);
		const topBorder =
			lastFrame.split('\n').find(line => line.startsWith('┌')) ?? '';
		t.assert.strictEqual(topBorder.length, 30);
	});
}

test('clear screen when terminal width decreases', async (t: TestContext) => {
	const stdout = createStdout(100);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Hello World</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, interactive: true});

	const initialOutput = stripAnsi(getWriteContents(stdout)[0]!);
	t.assert.ok(initialOutput.includes('Hello World'));
	t.assert.ok(initialOutput.includes('╭')); // Box border

	// Decrease width - should trigger clear and rerender
	stdout.columns = 50;
	stdout.emit('resize');
	await delay(100);

	// Verify the output was updated for smaller width
	const lastOutput = stripAnsi(getWriteContents(stdout).at(-1)!);
	t.assert.ok(lastOutput.includes('Hello World'));
	t.assert.ok(lastOutput.includes('╭')); // Box border
	t.assert.notStrictEqual(initialOutput, lastOutput); // Output should change due to width
});

test('no screen clear when terminal width increases', async (t: TestContext) => {
	const stdout = createStdout(50);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Test</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, interactive: true});

	const initialOutput = getWriteContents(stdout)[0]!;

	// Increase width - should rerender but not clear
	stdout.columns = 100;
	stdout.emit('resize');
	await delay(100);

	const lastOutput = getWriteContents(stdout).at(-1)!;

	// When increasing width, we don't clear, so we should see eraseLines used for incremental update
	// But when decreasing, the clear() is called which also uses eraseLines
	// The key difference: decreasing width triggers an explicit clear before render
	t.assert.notStrictEqual(stripAnsi(initialOutput), stripAnsi(lastOutput));
	t.assert.ok(stripAnsi(lastOutput).includes('Test'));
});

test('consecutive width decreases trigger screen clear each time', async (t: TestContext) => {
	const stdout = createStdout(100);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Content</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, interactive: true});

	const initialOutput = stripAnsi(getWriteContents(stdout)[0]!);

	// First decrease
	stdout.columns = 80;
	stdout.emit('resize');
	await delay(100);

	const afterFirstDecrease = stripAnsi(getWriteContents(stdout).at(-1)!);
	t.assert.notStrictEqual(initialOutput, afterFirstDecrease);
	t.assert.ok(afterFirstDecrease.includes('Content'));

	// Second decrease
	stdout.columns = 60;
	stdout.emit('resize');
	await delay(100);

	const afterSecondDecrease = stripAnsi(getWriteContents(stdout).at(-1)!);
	t.assert.notStrictEqual(afterFirstDecrease, afterSecondDecrease);
	t.assert.ok(afterSecondDecrease.includes('Content'));
});

test('width decrease clears lastOutput to force rerender', async (t: TestContext) => {
	const stdout = createStdout(100);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Test Content</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test />, {stdout, interactive: true});

	const initialOutput = stripAnsi(getWriteContents(stdout)[0]!);

	// Decrease width - with a border, this will definitely change the output
	stdout.columns = 50;
	stdout.emit('resize');
	await delay(100);

	const afterResizeOutput = stripAnsi(getWriteContents(stdout).at(-1)!);

	// Outputs should be different because the border width changed
	t.assert.notStrictEqual(initialOutput, afterResizeOutput);
	t.assert.ok(afterResizeOutput.includes('Test Content'));

	// Now try to rerender with a different component
	rerender(
		<Box borderStyle="round">
			<Text>Updated Content</Text>
		</Box>,
	);
	await delay(100);

	// Verify content was updated
	t.assert.ok(
		stripAnsi(getWriteContents(stdout).at(-1)!).includes('Updated Content'),
	);
});

// Replays the writes on a 10-row terminal below three shell lines, shrinking it to `rows` after the first `writesBeforeResize` writes. Only trailing empty rows are dropped, so a stray blank row inside the output still fails the comparison.
const screenAfterShrink = (
	stdout: FakeStdout,
	writesBeforeResize: number,
	rows: number,
): string[] => {
	const writes = stdout
		.getWrites()
		.map(write => write.replaceAll('\n', '\r\n'));
	const lines = reconstructTerminalLines(
		[
			'shell 0\r\nshell 1\r\nshell 2\r\n',
			...writes.slice(0, writesBeforeResize),
			{rows},
			...writes.slice(writesBeforeResize),
		],
		10,
	);

	while (lines.at(-1) === '') {
		lines.pop();
	}

	return lines;
};

const shell = ['shell 0', 'shell 1', 'shell 2'];
const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

function Frame({
	suffix = '',
	cursorY,
}: {
	readonly suffix?: string;
	readonly cursorY: number | undefined;
}) {
	const {setCursorPosition} = useCursor();
	setCursorPosition(cursorY === undefined ? undefined : {x: 0, y: cursorY});

	return (
		<Box flexDirection="column">
			{letters.map(letter => (
				<Text key={letter}>{letter + suffix}</Text>
			))}
		</Box>
	);
}

const lines = Array.from({length: 6}, (_, index) => `line ${index}`);
const frame = lines.join('\n');

function SixLines() {
	return (
		<Box flexDirection="column">
			{lines.map(line => (
				<Text key={line}>{line}</Text>
			))}
		</Box>
	);
}

for (const isIncrementalRendering of [false, true]) {
	const mode = isIncrementalRendering ? ' (incremental)' : '';
	const name = isIncrementalRendering ? 'incremental' : 'standard';

	for (const {cursorY, rows} of [
		{cursorY: 0, rows: 8},
		// The cursor has fewer rows below it than the shrink removes, so the terminal also scrolls the top off.
		{cursorY: 4, rows: 7},
	]) {
		test(`rows shrink with a cursor above the output bottom keeps lines above the frame - cursor row ${cursorY}, ${rows} rows${mode}`, async (t: TestContext) => {
			const stdout = createStdout(100);
			stdout.rows = 10;

			const {rerender, unmount, waitUntilRenderFlush} = render(
				<Frame cursorY={cursorY} />,
				{
					stdout,
					incrementalRendering: isIncrementalRendering,
					interactive: true,
				},
			);
			t.after(() => {
				unmount();
			});
			await waitUntilRenderFlush();

			const writesBeforeResize = stdout.getWrites().length;
			stdout.rows = rows;
			stdout.emit('resize');
			await waitUntilRenderFlush();

			// The shrink drops the frame rows below the cursor, so they have to be repainted right away.
			t.assert.deepStrictEqual(
				screenAfterShrink(stdout, writesBeforeResize, rows),
				[...shell, ...letters],
			);

			rerender(<Frame suffix="!" cursorY={cursorY} />);
			await waitUntilRenderFlush();

			t.assert.deepStrictEqual(
				screenAfterShrink(stdout, writesBeforeResize, rows),
				[...shell, ...letters.map(letter => letter + '!')],
			);
		});
	}

	test(`width and height shrinking together keeps lines above the frame${mode}`, async (t: TestContext) => {
		const stdout = createStdout(100);
		stdout.rows = 10;

		const {unmount, waitUntilRenderFlush} = render(<Frame cursorY={0} />, {
			stdout,
			interactive: true,
			incrementalRendering: isIncrementalRendering,
		});
		t.after(() => {
			unmount();
		});
		await waitUntilRenderFlush();

		const writesBeforeResize = stdout.getWrites().length;
		// A width decrease forces a redraw on its own; pairing it with a height decrease on the same resize event must still use the committed cursor position rather than the frame height to find what to erase.
		stdout.columns = 50;
		stdout.rows = 6;
		stdout.emit('resize');
		await waitUntilRenderFlush();

		t.assert.deepStrictEqual(screenAfterShrink(stdout, writesBeforeResize, 6), [
			...shell,
			...letters,
		]);
	});

	test(`rows shrink right after a commit clears the cursor keeps lines above the frame${mode}`, async (t: TestContext) => {
		const stdout = createStdout(100);
		stdout.rows = 10;

		const {rerender, unmount, waitUntilRenderFlush} = render(
			<Frame cursorY={0} />,
			{stdout, incrementalRendering: isIncrementalRendering, interactive: true},
		);
		t.after(() => {
			unmount();
		});
		await waitUntilRenderFlush();

		// The commit clears the cursor, but its frame is still throttled, so the terminal still shows the cursor when the rows shrink.
		rerender(<Frame cursorY={undefined} />);
		const writesBeforeResize = stdout.getWrites().length;
		stdout.rows = 8;
		stdout.emit('resize');
		await waitUntilRenderFlush();

		t.assert.deepStrictEqual(screenAfterShrink(stdout, writesBeforeResize, 8), [
			...shell,
			...letters,
		]);
	});

	test(`${name} rendering - erases and rewrites the frame when the terminal height shrinks onto it`, async (t: TestContext) => {
		const stdout = createStdout(40);
		stdout.rows = 10;

		const {unmount, waitUntilRenderFlush} = render(<SixLines />, {
			stdout,
			interactive: true,
			incrementalRendering: isIncrementalRendering,
		});
		t.after(() => {
			unmount();
		});
		await waitUntilRenderFlush();

		t.assert.strictEqual(getWriteContents(stdout).at(-1), frame + '\n');
		const writesBefore = getWriteContents(stdout).length;

		// The frame now exactly fills the viewport, so it loses its trailing newline while every visible line stays the same. The terminal scrolled the top row away when it shrank, so moving the cursor over unchanged lines is not enough.
		stdout.rows = 6;
		stdout.emit('resize');
		await waitUntilRenderFlush();

		t.assert.strictEqual(
			getWriteContents(stdout).slice(writesBefore).join(''),
			homeAndEraseDown + frame,
		);
	});

	function CursorSixLines({cursorRow}: {readonly cursorRow: number}) {
		const {setCursorPosition} = useCursor();
		setCursorPosition({x: 0, y: cursorRow});
		return <SixLines />;
	}

	for (const {description, initialCursorRow, shrink, windowsTodo} of [
		{
			description: 'a custom cursor sits on it',
			initialCursorRow: 0,
			shrink(stdout: FakeStdout) {
				stdout.emit('resize');
			},
		},
		{
			description: 'the same render moves a custom cursor',
			initialCursorRow: 4,
			// Windows keeps the absolute erase for fullscreen frames (#969), so the cursor-relative walk-up that preserves this row is skipped there.
			windowsTodo:
				'On Windows the row above the frame is erased when the same render moves the cursor',
			shrink(_stdout: FakeStdout, rerender: (tree: React.ReactNode) => void) {
				rerender(<CursorSixLines cursorRow={2} />);
			},
		},
	]) {
		test(
			`${name} rendering - keeps content above the frame when the terminal height shrinks onto it and ${description}`,
			{todo: process.platform === 'win32' && windowsTodo},
			async (t: TestContext) => {
				const stdout = createStdout(40);
				stdout.rows = 10;

				const {unmount, rerender, waitUntilRenderFlush} = render(
					<CursorSixLines cursorRow={initialCursorRow} />,
					{
						stdout,
						incrementalRendering: isIncrementalRendering,
						interactive: true,
					},
				);
				t.after(() => {
					unmount();
				});
				await waitUntilRenderFlush();

				const writesBefore = stdout.getWrites().length;
				stdout.rows = 6;
				shrink(stdout, rerender);
				await waitUntilRenderFlush();

				// The byte stream alone cannot show what a shrink erases, so replay it on a modelled terminal with shell output above the frame.
				const writes = stdout
					.getWrites()
					.map(write => write.replaceAll('\n', '\r\n'));
				const visibleLines = reconstructTerminalLines(
					[
						'shell 0\r\nshell 1\r\nshell 2\r\n',
						...writes.slice(0, writesBefore),
						{rows: 6},
						...writes.slice(writesBefore),
					],
					10,
				);

				t.assert.deepStrictEqual(visibleLines.filter(Boolean), [
					'shell 0',
					'shell 1',
					'shell 2',
					...frame.split('\n'),
				]);
			},
		);
	}

	test(`${name} rendering - writes nothing when the terminal height shrinks and the frame still fits`, async (t: TestContext) => {
		const stdout = createStdout(40);
		stdout.rows = 10;

		const {unmount, waitUntilRenderFlush} = render(<SixLines />, {
			stdout,
			interactive: true,
			incrementalRendering: isIncrementalRendering,
		});
		t.after(() => {
			unmount();
		});
		await waitUntilRenderFlush();

		t.assert.strictEqual(getWriteContents(stdout).at(-1), frame + '\n');
		const writesBefore = getWriteContents(stdout).length;

		// The terminal only scrolls when the cursor would fall off the bottom, so a frame that still fits stays where it is and the unchanged output is skipped.
		stdout.rows = 8;
		stdout.emit('resize');
		await waitUntilRenderFlush();

		t.assert.deepStrictEqual(getWriteContents(stdout).slice(writesBefore), []);
	});

	test(`${name} rendering - leaves fullscreen without clearing when the terminal height grows`, async (t: TestContext) => {
		const stdout = createStdout(40);
		stdout.rows = 6;

		const {unmount, waitUntilRenderFlush} = render(<SixLines />, {
			stdout,
			interactive: true,
			incrementalRendering: isIncrementalRendering,
		});
		t.after(() => {
			unmount();
		});
		await waitUntilRenderFlush();

		t.assert.strictEqual(getWriteContents(stdout).at(-1), frame);
		const writesBefore = getWriteContents(stdout).length;

		stdout.rows = 10;
		stdout.emit('resize');
		await waitUntilRenderFlush();

		t.assert.strictEqual(
			getWriteContents(stdout).slice(writesBefore).join(''),
			isIncrementalRendering
				? ansiEscapes.cursorUp(lines.length - 1) +
						ansiEscapes.cursorNextLine.repeat(lines.length)
				: ansiEscapes.eraseLines(lines.length) + frame + '\n',
		);
	});
}
