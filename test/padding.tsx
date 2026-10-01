import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('padding', (t: TestContext) => {
	const output = renderToString(
		<Box padding={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n  X\n\n');
});

test('padding X', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box paddingX={2}>
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '  X  Y');
});

test('removing paddingLeft restores paddingX on rerender', (t: TestContext) => {
	function Example({paddingLeft}: {readonly paddingLeft?: number}) {
		return (
			<Box>
				<Box paddingX={2} paddingLeft={paddingLeft}>
					<Text>X</Text>
				</Box>
				<Text>Y</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<Example paddingLeft={1} />, {
		stdout,
		debug: true,
	});
	t.after(() => {
		unmount();
	});

	t.assert.strictEqual(stdout.get(), ' X  Y');
	rerender(<Example />);
	t.assert.strictEqual(stdout.get(), '  X  Y');
	rerender(<Example paddingLeft={0} />);
	t.assert.strictEqual(stdout.get(), 'X  Y');
});

test('removing paddingX restores padding on rerender', (t: TestContext) => {
	function Example({paddingX}: {readonly paddingX?: number}) {
		return (
			<Box padding={2} paddingX={paddingX}>
				<Text>X</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<Example paddingX={1} />, {
		stdout,
		debug: true,
	});
	t.after(() => {
		unmount();
	});

	t.assert.strictEqual(stdout.get(), '\n\n X\n\n');
	rerender(<Example />);
	t.assert.strictEqual(stdout.get(), '\n\n  X\n\n');
});

test('padding Y', (t: TestContext) => {
	const output = renderToString(
		<Box paddingY={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nX\n\n');
});

test('padding top', (t: TestContext) => {
	const output = renderToString(
		<Box paddingTop={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nX');
});

test('padding bottom', (t: TestContext) => {
	const output = renderToString(
		<Box paddingBottom={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'X\n\n');
});

test('padding left', (t: TestContext) => {
	const output = renderToString(
		<Box paddingLeft={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '  X');
});

test('padding right', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box paddingRight={2}>
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'X  Y');
});

test('nested padding', (t: TestContext) => {
	const output = renderToString(
		<Box padding={2}>
			<Box padding={2}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n\n\n    X\n\n\n\n');
});

test('padding with multiline string', (t: TestContext) => {
	const output = renderToString(
		<Box padding={2}>
			<Text>{'A\nB'}</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n  A\n  B\n\n');
});

test('apply padding to text with newlines', (t: TestContext) => {
	const output = renderToString(
		<Box padding={1}>
			<Text>Hello{'\n'}World</Text>
		</Box>,
	);
	t.assert.strictEqual(output, '\n Hello\n World\n');
});

test('apply padding to wrapped text', (t: TestContext) => {
	const output = renderToString(
		<Box padding={1} width={5}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n Hel\n lo\n Wor\n ld\n');
});

test('text wrapping respects paddingX with flexGrow', (t: TestContext) => {
	// https://github.com/vadimdemedes/ink/issues/584
	const output = renderToString(
		<Box width={40} borderStyle="round">
			<Box paddingX={2}>
				<Box marginLeft={2}>
					<Text>•</Text>
					<Box flexGrow={1} marginLeft={1}>
						<Text>Lorem ipsum dolor sit amet, consectetur adipiscing elit</Text>
					</Box>
				</Box>
			</Box>
		</Box>,
	);

	const lines = output.split('\n');
	for (const line of lines) {
		t.assert.ok(
			line.length <= 40,
			`Line "${line}" exceeds container width of 40 (got ${line.length})`,
		);
	}
});

// Concurrent mode tests
test('padding - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box padding={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n  X\n\n');
});

test('nested padding - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box padding={2}>
			<Box padding={2}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n\n\n    X\n\n\n\n');
});
