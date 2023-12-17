import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('direction row', t => {
	const output = renderToString(
		<Box flexDirection="row">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB');
});

test('direction row reverse', t => {
	const output = renderToString(
		<Box flexDirection="row-reverse" width={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '  BA');
});

test('direction column', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\nB');
});

test('direction column reverse', t => {
	const output = renderToString(
		<Box flexDirection="column-reverse" height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '\n\nB\nA');
});

test('don’t squash text nodes when column direction is applied', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\nB');
});
