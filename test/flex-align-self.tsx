import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - align text to center', t => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="center">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\nTest\n');
});

test('row - align multiple text nodes to center', t => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="center">
				<Text>A</Text>
				<Text>B</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\nAB\n');
});

test('row - align text to bottom', t => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="flex-end">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n\nTest');
});

test('row - align multiple text nodes to bottom', t => {
	const output = renderToString(
		<Box height={3}>
			<Box alignSelf="flex-end">
				<Text>A</Text>
				<Text>B</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n\nAB');
});

test('column - align text to center', t => {
	const output = renderToString(
		<Box flexDirection="column" width={10}>
			<Box alignSelf="center">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.is(output, '   Test');
});

test('column - align text to right', t => {
	const output = renderToString(
		<Box flexDirection="column" width={10}>
			<Box alignSelf="flex-end">
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	t.is(output, '      Test');
});
