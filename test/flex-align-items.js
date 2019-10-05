/* eslint-disable react/jsx-curly-brace-presence */
import React from 'react';
import test from 'ava';
import renderToString from './helpers/render-to-string';
import {Box} from '..';

test('row - align text to center', t => {
	const output = renderToString(
		<Box alignItems="center" height={3}>
			Test
		</Box>
	);

	t.is(output, '\nTest\n');
});

test('row - align multiple text nodes to center', t => {
	const output = renderToString(
		<Box alignItems="center" height={3}>
			A{'B'}
		</Box>
	);

	t.is(output, '\nAB\n');
});

test('row - align text to bottom', t => {
	const output = renderToString(
		<Box alignItems="flex-end" height={3}>
			Test
		</Box>
	);

	t.is(output, '\n\nTest');
});

test('row - align multiple text nodes to bottom', t => {
	const output = renderToString(
		<Box alignItems="flex-end" height={3}>
			A{'B'}
		</Box>
	);

	t.is(output, '\n\nAB');
});

test('column - align text to center', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="center" width={10}>
			Test
		</Box>
	);

	t.is(output, '   Test');
});

test('column - align text to right', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-end" width={10}>
			Test
		</Box>
	);

	t.is(output, '      Test');
});
