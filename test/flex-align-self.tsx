import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, Newline} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - align text to center', (t: TestContext) => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="center">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\nTest\n');
});

test('row - align multiple text nodes to center', (t: TestContext) => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="center">
				<Text>A</Text>
				<Text>B</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\nAB\n');
});

test('row - align text to bottom', (t: TestContext) => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="flex-end">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nTest');
});

test('row - align multiple text nodes to bottom', (t: TestContext) => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="flex-end">
				<Text>A</Text>
				<Text>B</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\n\nAB');
});

test('column - align text to center', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" width={10}>
			<Box alignSelf="center">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '   Test');
});

test('column - align text to right', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" width={10}>
			<Box alignSelf="flex-end">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '      Test');
});

test('column - align self stretch', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" width={7}>
			<Box alignSelf="stretch" borderStyle="single">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '┌─────┐\n│X    │\n└─────┘');
});

test('row - align self stretch', (t: TestContext) => {
	const output = renderToString(
		<Box height={5}>
			<Box alignSelf="stretch" borderStyle="single">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '┌─┐\n│X│\n│ │\n│ │\n└─┘');
});

test('row - align self baseline', (t: TestContext) => {
	const output = renderToString(
		<Box alignItems="flex-end" height={3}>
			<Text>
				A
				<Newline />B
			</Text>
			<Box alignSelf="baseline">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'AX\nB\n');
});
