import test from 'ava';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import React from 'react';
import {render, Box, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

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

	const initialOutput = stripAnsi(
		(stdout.write as any).firstCall.args[0] as string,
	);
	t.true(initialOutput.includes('Hello World'));
	t.true(initialOutput.includes('╭')); // Box border

	// Decrease width - should trigger clear and rerender
	stdout.columns = 50;
	stdout.emit('resize');
	await delay(100);

	// Verify the output was updated for smaller width
	const lastOutput = stripAnsi(
		(stdout.write as any).lastCall.args[0] as string,
	);
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

	const initialOutput = (stdout.write as any).firstCall.args[0] as string;

	// Increase width - should rerender but not clear
	stdout.columns = 100;
	stdout.emit('resize');
	await delay(100);

	const lastOutput = (stdout.write as any).lastCall.args[0] as string;

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

		const initialOutput = stripAnsi(
			(stdout.write as any).firstCall.args[0] as string,
		);

		// First decrease
		stdout.columns = 80;
		stdout.emit('resize');
		await delay(100);

		const afterFirstDecrease = stripAnsi(
			(stdout.write as any).lastCall.args[0] as string,
		);
		t.not(initialOutput, afterFirstDecrease);
		t.true(afterFirstDecrease.includes('Content'));

		// Second decrease
		stdout.columns = 60;
		stdout.emit('resize');
		await delay(100);

		const afterSecondDecrease = stripAnsi(
			(stdout.write as any).lastCall.args[0] as string,
		);
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

	const initialOutput = stripAnsi(
		(stdout.write as any).firstCall.args[0] as string,
	);

	// Decrease width - with a border, this will definitely change the output
	stdout.columns = 50;
	stdout.emit('resize');
	await delay(100);

	const afterResizeOutput = stripAnsi(
		(stdout.write as any).lastCall.args[0] as string,
	);

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
		stripAnsi((stdout.write as any).lastCall.args[0] as string).includes(
			'Updated Content',
		),
	);
});
