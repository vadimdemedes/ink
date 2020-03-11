import React from 'react';
import test from 'ava';
import renderToString from './helpers/render-to-string';
import {Box} from '../src';

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

test('set flex basis with flexDirection="row" container', t => {
	const output = renderToString(
		<Box width={6}>
			<Box flexBasis={3}>
				A
			</Box>

			B
		</Box>
	);

	t.is(output, 'A  B');
});

test('set flex basis in percent with flexDirection="row" container', t => {
	const output = renderToString(
		<Box width={6}>
			<Box flexBasis="50%">
				A
			</Box>

			B
		</Box>
	);

	t.is(output, 'A  B');
});

test('set flex basis with flexDirection="column" container', t => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box flexBasis={3}>
				A
			</Box>

			B
		</Box>
	);

	t.is(output, 'A\n\n\nB\n\n');
});

test('set flex basis in percent with flexDirection="column" container', t => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box flexBasis="50%">
				A
			</Box>

			B
		</Box>
	);

	t.is(output, 'A\n\n\nB\n\n');
});
