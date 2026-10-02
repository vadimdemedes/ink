import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - no wrap', (t: TestContext) => {
	const output = renderToString(
		<Box width={2}>
			<Text>A</Text>
			<Text>BC</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'BC\n');
});

test('column - no wrap', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" height={2}>
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'B\nC');
});

test('row - wrap content', (t: TestContext) => {
	const output = renderToString(
		<Box width={2} flexWrap="wrap">
			<Text>A</Text>
			<Text>BC</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nBC');
});

for (const [initialWrap, initialOutput] of [
	['wrap', 'AB\nCD'],
	['wrap-reverse', 'CD\nAB'],
] as const) {
	test(`setting ${initialWrap} to undefined restores nowrap`, (t: TestContext) => {
		function Example({wrap}: {readonly wrap?: 'wrap' | 'wrap-reverse'}) {
			return (
				<Box width={3} flexWrap={wrap}>
					<Box flexShrink={0}>
						<Text>AB</Text>
					</Box>
					<Box flexShrink={0}>
						<Text>CD</Text>
					</Box>
				</Box>
			);
		}

		const stdout = createStdout();
		const {rerender, unmount} = render(<Example wrap={initialWrap} />, {
			stdout,
			debug: true,
		});
		t.after(() => {
			unmount();
		});

		t.assert.strictEqual(stdout.get(), initialOutput);
		rerender(<Example />);
		t.assert.strictEqual(stdout.get(), 'ABCD');
	});
}

test('column - wrap content', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" height={2} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'AC\nB');
});

test('column - wrap content reverse', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" height={2} width={3} flexWrap="wrap-reverse">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, ' CA\n  B');
});

test('row - wrap content reverse', (t: TestContext) => {
	const output = renderToString(
		<Box height={3} width={2} flexWrap="wrap-reverse">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\nC\nAB');
});
