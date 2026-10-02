import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('margin', (t: TestContext) => {
	const output = renderToString(
		<Box margin={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n  X\n\n');
});

test('margin X', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box marginX={2}>
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '  X  Y');
});

test('removing marginLeft restores marginX on rerender', (t: TestContext) => {
	function Example({marginLeft}: {readonly marginLeft?: number}) {
		return (
			<Box>
				<Box marginX={2} marginLeft={marginLeft}>
					<Text>X</Text>
				</Box>
				<Text>Y</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<Example marginLeft={1} />, {
		stdout,
		debug: true,
	});
	t.after(() => {
		unmount();
	});

	t.assert.strictEqual(stdout.get(), ' X  Y');
	rerender(<Example />);
	t.assert.strictEqual(stdout.get(), '  X  Y');
	rerender(<Example marginLeft={0} />);
	t.assert.strictEqual(stdout.get(), 'X  Y');
});

test('margin Y', (t: TestContext) => {
	const output = renderToString(
		<Box marginY={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nX\n\n');
});

test('margin top', (t: TestContext) => {
	const output = renderToString(
		<Box marginTop={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nX');
});

test('margin bottom', (t: TestContext) => {
	const output = renderToString(
		<Box marginBottom={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'X\n\n');
});

test('margin left', (t: TestContext) => {
	const output = renderToString(
		<Box marginLeft={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '  X');
});

test('margin right', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box marginRight={2}>
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'X  Y');
});

test('nested margin', (t: TestContext) => {
	const output = renderToString(
		<Box margin={2}>
			<Box margin={2}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n\n\n    X\n\n\n\n');
});

test('margin with multiline string', (t: TestContext) => {
	const output = renderToString(
		<Box margin={2}>
			<Text>{'A\nB'}</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n  A\n  B\n\n');
});

test('apply margin to text with newlines', (t: TestContext) => {
	const output = renderToString(
		<Box margin={1}>
			<Text>Hello{'\n'}World</Text>
		</Box>,
	);
	t.assert.strictEqual(output, '\n Hello\n World\n');
});

test('apply margin to wrapped text', (t: TestContext) => {
	const output = renderToString(
		<Box margin={1} width={6}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n Hello\n World\n');
});

test('negative margin top with multiline string', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box marginTop={-1} flexDirection="column">
				<Text>{'Line 1\nLine 2\nLine 3'}</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'Line 2\nLine 3');
});

// Concurrent mode tests
test('margin - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box margin={2}>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n  X\n\n');
});

test('nested margin - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box margin={2}>
			<Box margin={2}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\n\n\n    X\n\n\n\n');
});
