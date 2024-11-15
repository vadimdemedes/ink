import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - align text to center', t => {
	const output = renderToString(
		<Box justifyContent="center" width={10}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '   Test');
});

test('row - align multiple text nodes to center', t => {
	const output = renderToString(
		<Box justifyContent="center" width={10}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '    AB');
});

test('row - align text to right', t => {
	const output = renderToString(
		<Box justifyContent="flex-end" width={10}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '      Test');
});

test('row - align multiple text nodes to right', t => {
	const output = renderToString(
		<Box justifyContent="flex-end" width={10}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '        AB');
});

test('row - align two text nodes on the edges', t => {
	const output = renderToString(
		<Box justifyContent="space-between" width={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A  B');
});

test('row - space evenly two text nodes', t => {
	const output = renderToString(
		<Box justifyContent="space-evenly" width={10}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '  A   B');
});

// Yoga has a bug, where first child in a container with space-around doesn't have
// the correct X coordinate and measure function is used on that child node
test.failing('row - align two text nodes with equal space around them', t => {
	const output = renderToString(
		<Box justifyContent="space-around" width={5}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, ' A B');
});

test('row - align colored text node when text is squashed', t => {
	const output = renderToString(
		<Box justifyContent="flex-end" width={5}>
			<Text color="green">X</Text>
		</Box>,
	);

	t.is(output, `    ${chalk.green('X')}`);
});

test('column - align text to center', t => {
	const output = renderToString(
		<Box flexDirection="column" justifyContent="center" height={3}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '\nTest\n');
});

test('column - align text to bottom', t => {
	const output = renderToString(
		<Box flexDirection="column" justifyContent="flex-end" height={3}>
			<Text>Test</Text>
		</Box>,
	);

	t.is(output, '\n\nTest');
});

test('column - align two text nodes on the edges', t => {
	const output = renderToString(
		<Box flexDirection="column" justifyContent="space-between" height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\n\n\nB');
});

// Yoga has a bug, where first child in a container with space-around doesn't have
// the correct X coordinate and measure function is used on that child node
test.failing(
	'column - align two text nodes with equal space around them',
	t => {
		const output = renderToString(
			<Box flexDirection="column" justifyContent="space-around" height={5}>
				<Text>A</Text>
				<Text>B</Text>
			</Box>,
		);

		t.is(output, '\nA\n\nB\n');
	},
);
