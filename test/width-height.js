import React from 'react';
import test from 'ava';
import {Box} from '..';
import renderToString from './helpers/render-to-string';

test('set width', t => {
	const output = renderToString(
		<Box>
			<Box width={5}>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'A    B');
});

test('set height', t => {
	const output = renderToString(
		<Box height={4}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'AB\n\n\n');
});
