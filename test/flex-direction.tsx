import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('direction row', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="row">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'AB');
});

test('undefined direction uses the default row layout', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection={undefined}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'AB');
});

test('undefined direction uses row separators for screen readers', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection={undefined}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{isScreenReaderEnabled: true},
	);

	t.assert.strictEqual(output, 'A B');
});

test('setting direction to undefined restores the default row layout', (t: TestContext) => {
	function Example({direction}: {readonly direction?: 'column'}) {
		return (
			<Box flexDirection={direction}>
				<Text>A</Text>
				<Text>B</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<Example direction="column" />, {
		stdout,
		debug: true,
	});
	t.after(() => {
		unmount();
	});

	t.assert.strictEqual(stdout.get(), 'A\nB');
	rerender(<Example />);
	t.assert.strictEqual(stdout.get(), 'AB');
});

test('direction row reverse', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="row-reverse" width={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '  BA');
});

test('direction column', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nB');
});

test('direction column reverse', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column-reverse" height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nB\nA');
});

test('don’t squash text nodes when column direction is applied', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nB');
});

// Concurrent mode tests
test('direction row - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box flexDirection="row">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'AB');
});

test('direction column - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nB');
});
