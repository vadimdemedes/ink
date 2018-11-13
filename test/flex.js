import React from 'react';
import test from 'ava';
import {Box, renderToString} from '..';

test('grow equally', t => {
	const output = renderToString(
		<Box width={6}>
			<Box flexGrow={1}>A</Box>
			<Box flexGrow={1}>B</Box>
		</Box>
	);

	t.is(output, 'A  B');
});

test('grow one element', t => {
	const output = renderToString(
		<Box width={6}>
			<Box flexGrow={1}>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'A    B');
});

test('dont shrink', t => {
	const output = renderToString(
		<Box width={10}>
			<Box flexShrink={0} width={6}>
				A
			</Box>
			<Box flexShrink={0} width={6}>
				B
			</Box>
			<Box>C</Box>
		</Box>
	);

	t.is(output, 'A     B     C');
});

test('shrink equally', t => {
	const output = renderToString(
		<Box width={10}>
			<Box flexShrink={1} width={6}>
				A
			</Box>
			<Box flexShrink={1} width={6}>
				B
			</Box>
			<Box>C</Box>
		</Box>
	);

	t.is(output, 'A    B   C');
});
