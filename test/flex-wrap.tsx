import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - no wrap', t => {
	const output = renderToString(
		<Box width={2}>
			<Text>A</Text>
			<Text>BC</Text>
		</Box>,
	);

	t.is(output, 'BC\n');
});

test('column - no wrap', t => {
	const output = renderToString(
		<Box flexDirection="column" height={2}>
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, 'B\nC');
});

test('row - wrap content', t => {
	const output = renderToString(
		<Box width={2} flexWrap="wrap">
			<Text>A</Text>
			<Text>BC</Text>
		</Box>,
	);

	t.is(output, 'A\nBC');
});

test('column - wrap content', t => {
	const output = renderToString(
		<Box flexDirection="column" height={2} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, 'AC\nB');
});

test('column - wrap content reverse', t => {
	const output = renderToString(
		<Box flexDirection="column" height={2} width={3} flexWrap="wrap-reverse">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, ' CA\n  B');
});

test('row - wrap content reverse', t => {
	const output = renderToString(
		<Box height={3} width={2} flexWrap="wrap-reverse">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, '\nC\nAB');
});
