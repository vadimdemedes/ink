import process from 'node:process';
import test from 'ava';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import React from 'react';
import {render, Box, Text, useWindowSize} from '../src/index.js';
import createStdout, {type FakeStdout} from './helpers/create-stdout.js';

const getWriteContents = (stdout: FakeStdout): string[] => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
	return (stdout.write as any)
		.getCalls()
		.map((c: any) => c.args[0] as string)
		.filter(
			(w: string) =>
				!w.startsWith('\u001B[?25') && !w.startsWith('\u001B[?2026'),
		);
};

test.serial(
	'useWindowSize returns current terminal dimensions and updates on resize',
	async t => {
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

		const {waitUntilRenderFlush} = render(<Test />, {stdout});
		await waitUntilRenderFlush();

		t.true(stripAnsi(getWriteContents(stdout).at(-1)!).includes('100x40'));

		(stdout as any).columns = 60;
		(stdout as any).rows = 20;
		stdout.emit('resize');
		await delay(100);

		t.true(stripAnsi(getWriteContents(stdout).at(-1)!).includes('60x20'));
	},
);

test.serial('useWindowSize removes resize listener on unmount', async t => {
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

	t.true(stdout.listenerCount('resize') > initialListenerCount);
	unmount();

	t.is(stdout.listenerCount('resize'), initialListenerCount);
});

test.serial(
	'useWindowSize does not crash when resize fires after unmount',
	async t => {
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

		t.pass();
	},
);

test.serial(
	'useWindowSize falls back to a positive column count when stdout.columns is 0',
	async t => {
		const stdout = createStdout(0);
		let capturedColumns = -1;

		function Test() {
			const {columns} = useWindowSize();
			capturedColumns = columns;
			return <Text>{columns}</Text>;
		}

		const {waitUntilRenderFlush} = render(<Test />, {stdout});
		await waitUntilRenderFlush();

		t.true(capturedColumns > 0);
	},
);

test.serial(
	'useWindowSize falls back to terminal-size rows when stdout.rows is missing',
	async t => {
		const stdout = createStdout(0);
		let capturedRows = -1;
		const originalColumns = process.env.COLUMNS;
		const originalLines = process.env.LINES;
		const originalProcessStdoutColumns = process.stdout.columns;
		const originalProcessStdoutRows = process.stdout.rows;
		const originalProcessStderrColumns = process.stderr.columns;
		const originalProcessStderrRows = process.stderr.rows;

		t.teardown(() => {
			process.env.COLUMNS = originalColumns;
			process.env.LINES = originalLines;
			process.stdout.columns = originalProcessStdoutColumns;
			process.stdout.rows = originalProcessStdoutRows;
			process.stderr.columns = originalProcessStderrColumns;
			process.stderr.rows = originalProcessStderrRows;
		});

		process.env.COLUMNS = '123';
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

		t.is(capturedRows, 45);
	},
);

test.serial('clear screen when terminal width decreases', async t => {
	const stdout = createStdout(100);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Hello World</Text>
			</Box>
		);
	}

	render(<Test />, {stdout});

	const initialOutput = stripAnsi(getWriteContents(stdout)[0]!);
	t.true(initialOutput.includes('Hello World'));
	t.true(initialOutput.includes('╭')); // Box border

	// Decrease width - should trigger clear and rerender
	stdout.columns = 50;
	stdout.emit('resize');
	await delay(100);

	// Verify the output was updated for smaller width
	const lastOutput = stripAnsi(getWriteContents(stdout).at(-1)!);
	t.true(lastOutput.includes('Hello World'));
	t.true(lastOutput.includes('╭')); // Box border
	t.not(initialOutput, lastOutput); // Output should change due to width
});

test.serial('no screen clear when terminal width increases', async t => {
	const stdout = createStdout(50);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Test</Text>
			</Box>
		);
	}

	render(<Test />, {stdout});

	const initialOutput = getWriteContents(stdout)[0]!;

	// Increase width - should rerender but not clear
	stdout.columns = 100;
	stdout.emit('resize');
	await delay(100);

	const lastOutput = getWriteContents(stdout).at(-1)!;

	// When increasing width, we don't clear, so we should see eraseLines used for incremental update
	// But when decreasing, the clear() is called which also uses eraseLines
	// The key difference: decreasing width triggers an explicit clear before render
	t.not(stripAnsi(initialOutput), stripAnsi(lastOutput));
	t.true(stripAnsi(lastOutput).includes('Test'));
});

test.serial(
	'consecutive width decreases trigger screen clear each time',
	async t => {
		const stdout = createStdout(100);

		function Test() {
			return (
				<Box borderStyle="round">
					<Text>Content</Text>
				</Box>
			);
		}

		render(<Test />, {stdout});

		const initialOutput = stripAnsi(getWriteContents(stdout)[0]!);

		// First decrease
		stdout.columns = 80;
		stdout.emit('resize');
		await delay(100);

		const afterFirstDecrease = stripAnsi(getWriteContents(stdout).at(-1)!);
		t.not(initialOutput, afterFirstDecrease);
		t.true(afterFirstDecrease.includes('Content'));

		// Second decrease
		stdout.columns = 60;
		stdout.emit('resize');
		await delay(100);

		const afterSecondDecrease = stripAnsi(getWriteContents(stdout).at(-1)!);
		t.not(afterFirstDecrease, afterSecondDecrease);
		t.true(afterSecondDecrease.includes('Content'));
	},
);

test.serial('width decrease clears lastOutput to force rerender', async t => {
	const stdout = createStdout(100);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Test Content</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test />, {stdout});

	const initialOutput = stripAnsi(getWriteContents(stdout)[0]!);

	// Decrease width - with a border, this will definitely change the output
	stdout.columns = 50;
	stdout.emit('resize');
	await delay(100);

	const afterResizeOutput = stripAnsi(getWriteContents(stdout).at(-1)!);

	// Outputs should be different because the border width changed
	t.not(initialOutput, afterResizeOutput);
	t.true(afterResizeOutput.includes('Test Content'));

	// Now try to rerender with a different component
	rerender(
		<Box borderStyle="round">
			<Text>Updated Content</Text>
		</Box>,
	);
	await delay(100);

	// Verify content was updated
	t.true(
		stripAnsi(getWriteContents(stdout).at(-1)!).includes('Updated Content'),
	);
});
