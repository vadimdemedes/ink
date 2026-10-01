import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, Newline} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - align text to center', (t: TestContext) => {
	const output = renderToString(
		<Box alignItems="center" height={3}>
			<Text>Test</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\nTest\n');
});

test('row - align multiple text nodes to center', (t: TestContext) => {
	const output = renderToString(
		<Box alignItems="center" height={3}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\nAB\n');
});

test('row - align text to bottom', (t: TestContext) => {
	const output = renderToString(
		<Box alignItems="flex-end" height={3}>
			<Text>Test</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nTest');
});

test('row - align multiple text nodes to bottom', (t: TestContext) => {
	const output = renderToString(
		<Box alignItems="flex-end" height={3}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nAB');
});

test('column - align text to center', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="center" width={10}>
			<Text>Test</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '   Test');
});

test('column - align text to right', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-end" width={10}>
			<Text>Test</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '      Test');
});

test('row - align items stretch', (t: TestContext) => {
	const output = renderToString(
		<Box alignItems="stretch" height={5}>
			<Box borderStyle="single">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '┌─┐\n│X│\n│ │\n│ │\n└─┘');
});

test('row - default align items stretches children', (t: TestContext) => {
	const output = renderToString(
		<Box height={5}>
			<Box borderStyle="single">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '┌─┐\n│X│\n│ │\n│ │\n└─┘');
});

test('row - align text to baseline', (t: TestContext) => {
	const output = renderToString(
		<Box alignItems="baseline" height={3}>
			<Text>
				A
				<Newline />B
			</Text>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nBX\n');
});
