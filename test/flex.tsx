import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('grow equally', (t: TestContext) => {
	const output = renderToString(
		<Box width={6}>
			<Box flexGrow={1}>
				<Text>A</Text>
			</Box>
			<Box flexGrow={1}>
				<Text>B</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'A  B');
});

test('grow one element', (t: TestContext) => {
	const output = renderToString(
		<Box width={6}>
			<Box flexGrow={1}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A    B');
});

test('do not shrink', (t: TestContext) => {
	const output = renderToString(
		<Box width={16}>
			<Box flexShrink={0} width={6}>
				<Text>A</Text>
			</Box>
			<Box flexShrink={0} width={6}>
				<Text>B</Text>
			</Box>
			<Box width={6}>
				<Text>C</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'A     B     C');
});

test('shrink equally', (t: TestContext) => {
	const output = renderToString(
		<Box width={10}>
			<Box flexShrink={1} width={6}>
				<Text>A</Text>
			</Box>
			<Box flexShrink={1} width={6}>
				<Text>B</Text>
			</Box>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A    B   C');
});

test('set flex basis with flexDirection="row" container', (t: TestContext) => {
	const output = renderToString(
		<Box width={6}>
			<Box flexBasis={3}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A  B');
});

test('set flex basis in percent with flexDirection="row" container', (t: TestContext) => {
	const output = renderToString(
		<Box width={6}>
			<Box flexBasis="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A  B');
});

test('set flex basis with flexDirection="column" container', (t: TestContext) => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box flexBasis={3}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\n\n\nB\n\n');
});

test('set flex basis in percent with flexDirection="column" container', (t: TestContext) => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box flexBasis="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\n\n\nB\n\n');
});
