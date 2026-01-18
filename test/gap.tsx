import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('gap', t => {
	const output = renderToString(
		<Box gap={1} width={3} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, 'A B\n\nC');
});

test('column gap', t => {
	const output = renderToString(
		<Box gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A B');
});

test('row gap', t => {
	const output = renderToString(
		<Box flexDirection="column" gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\n\nB');
});

// Concurrent mode tests
test('gap - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box gap={1} width={3} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, 'A B\n\nC');
});

test('column gap - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A B');
});

test('row gap - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box flexDirection="column" gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\n\nB');
});
