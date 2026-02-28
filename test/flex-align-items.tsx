import React from 'react';
import test from 'ava';
import {Box, Text, Newline} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - align text to center', t => {
	const output = renderToString(
		<Box alignItems="center" height={3}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '\nTest\n');
});

test('row - align multiple text nodes to center', t => {
	const output = renderToString(
		<Box alignItems="center" height={3}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '\nAB\n');
});

test('row - align text to bottom', t => {
	const output = renderToString(
		<Box alignItems="flex-end" height={3}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '\n\nTest');
});

test('row - align multiple text nodes to bottom', t => {
	const output = renderToString(
		<Box alignItems="flex-end" height={3}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '\n\nAB');
});

test('column - align text to center', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="center" width={10}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '   Test');
});

test('column - align text to right', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-end" width={10}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '      Test');
});

test('row - align items stretch', t => {
	const output = renderToString(
		<Box alignItems="stretch" height={5}>
			<Box borderStyle="single">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '┌─┐\n│X│\n│ │\n│ │\n└─┘');
});

test('row - default align items stretches children', t => {
	const output = renderToString(
		<Box height={5}>
			<Box borderStyle="single">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '┌─┐\n│X│\n│ │\n│ │\n└─┘');
});

test('row - align text to baseline', t => {
	const output = renderToString(
		<Box alignItems="baseline" height={3}>
			<Text>
				A
				<Newline />B
			</Text>
			<Text>X</Text>
		</Box>,
	);

	t.is(output, 'A\nBX\n');
});
