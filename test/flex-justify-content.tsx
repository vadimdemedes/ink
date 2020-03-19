import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import renderToString from './helpers/render-to-string';
import {Box, Color} from '../src';

test('row - align text to center', t => {
	const output = renderToString(
		<Box justifyContent="center" width={10}>
			Test
		</Box>
	);

	t.is(output, '   Test');
});

test('row - align multiple text nodes to center', t => {
	const output = renderToString(
		<Box justifyContent="center" width={10}>
			A{'B'}
		</Box>
	);

	t.is(output, '    AB');
});

test('row - align text to right', t => {
	const output = renderToString(
		<Box justifyContent="flex-end" width={10}>
			Test
		</Box>
	);

	t.is(output, '      Test');
});

test('row - align multiple text nodes to right', t => {
	const output = renderToString(
		<Box justifyContent="flex-end" width={10}>
			A{'B'}
		</Box>
	);

	t.is(output, '        AB');
});

test('row - align two text nodes on the edges', t => {
	const output = renderToString(
		<Box justifyContent="space-between" width={4}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'A  B');
});

test('row - align two text nodes with equal space around them', t => {
	const output = renderToString(
		<Box justifyContent="space-around" width={5}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, ' A B');
});

test('row - align colored text node when text is squashed', t => {
	const output = renderToString(
		<Box justifyContent="flex-end" width={5}>
			<Color green>X</Color>
		</Box>
	);

	t.is(output, `    ${chalk.green('X')}`);
});

test('column - align text to center', t => {
	const output = renderToString(
		<Box flexDirection="column" justifyContent="center" height={3}>
			Test
		</Box>
	);

	t.is(output, '\nTest\n');
});

test('column - align text to bottom', t => {
	const output = renderToString(
		<Box flexDirection="column" justifyContent="flex-end" height={3}>
			Test
		</Box>
	);

	t.is(output, '\n\nTest');
});

test('column - align two text nodes on the edges', t => {
	const output = renderToString(
		<Box flexDirection="column" justifyContent="space-between" height={4}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, 'A\n\n\nB');
});

test('column - align two text nodes with equal space around them', t => {
	const output = renderToString(
		<Box flexDirection="column" justifyContent="space-around" height={5}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	);

	t.is(output, '\nA\n\nB\n');
});
