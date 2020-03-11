import React from 'react';
import test from 'ava';
import renderToString from './helpers/render-to-string';
import {Box} from '../src';

test('set width', t => {
	const output = renderToString(
		<Box>
			<Box width={5}>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'A    B');
});

test('set width in percent', t => {
	const output = renderToString(
		<Box width={10}>
			<Box width="50%">A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'A    B');
});

test('set min width', t => {
	const smallerOutput = renderToString(
		<Box>
			<Box minWidth={5}>A</Box>
			B
		</Box>
	);

	t.is(smallerOutput, 'A    B');

	const largerOutput = renderToString(
		<Box>
			<Box minWidth={2}>AAAAA</Box>
			B
		</Box>
	);

	t.is(largerOutput, 'AAAAAB');
});

test.failing('set min width in percent', t => {
	const output = renderToString(
		<Box width={10}>
			<Box minWidth="50%">A</Box>
			B
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

test('set height in percent', t => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box height="50%">A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'A\n\n\nB\n\n');
});

test('cut text over the set height', t => {
	const output = renderToString((
		<Box textWrap="wrap" height={2}>
			AAAABBBBCCCC
		</Box>
	), {columns: 4});

	t.is(output, 'AAAA\nBBBB');
});

test('set min height', t => {
	const smallerOutput = renderToString(
		<Box minHeight={4}>
			A
		</Box>
	);

	t.is(smallerOutput, 'A\n\n\n');

	const largerOutput = renderToString(
		<Box minHeight={2}>
			<Box height={4}>A</Box>
		</Box>
	);

	t.is(largerOutput, 'A\n\n\n');
});
