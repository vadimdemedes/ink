import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('gap', (t: TestContext) => {
	const output = renderToString(
		<Box gap={1} width={3} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A B\n\nC');
});

test('column gap', (t: TestContext) => {
	const output = renderToString(
		<Box gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A B');
});

test('row gap', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\n\nB');
});

for (const [property, flexDirection, separator] of [
	['columnGap', 'row', ' '],
	['rowGap', 'column', '\n'],
] as const) {
	test(`removing ${property} restores gap on rerender`, (t: TestContext) => {
		function Example({override}: {readonly override?: number}) {
			return (
				<Box gap={2} flexDirection={flexDirection} {...{[property]: override}}>
					<Text>A</Text>
					<Text>B</Text>
				</Box>
			);
		}

		const stdout = createStdout();
		const {rerender, unmount} = render(<Example override={1} />, {
			stdout,
			debug: true,
		});
		t.after(() => {
			unmount();
		});
		const lineBreak = flexDirection === 'column' ? '\n' : '';

		t.assert.strictEqual(stdout.get(), `A${separator}${lineBreak}B`);
		rerender(<Example />);
		t.assert.strictEqual(stdout.get(), `A${separator.repeat(2)}${lineBreak}B`);
		rerender(<Example override={0} />);
		t.assert.strictEqual(stdout.get(), `A${lineBreak}B`);
		rerender(<Example />);
		t.assert.strictEqual(stdout.get(), `A${separator.repeat(2)}${lineBreak}B`);
	});
}

// Concurrent mode tests
test('gap - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box gap={1} width={3} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A B\n\nC');
});

test('column gap - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A B');
});

test('row gap - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box flexDirection="column" gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\n\nB');
});
