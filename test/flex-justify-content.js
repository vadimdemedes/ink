import React from 'react';
import test from 'ava';
import {Box} from '..';
import Stream from './helpers/stream';
import render from './helpers/render';

test('row - align text to center', t => {
	const stream = new Stream();
	render(
		<Box justifyContent="center" width={10}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '   Test\n');
});

test('row - align text to right', t => {
	const stream = new Stream();
	render(
		<Box justifyContent="flex-end" width={10}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '      Test\n');
});

test('row - align two text nodes on the edges', t => {
	const stream = new Stream();
	render(
		<Box justifyContent="space-between" width={4}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'A  B\n');
});

test('row - align two text nodes with equal space around them', t => {
	const stream = new Stream();
	render(
		<Box justifyContent="space-around" width={5}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), ' A B\n');
});

test('column - align text to center', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column" justifyContent="center" height={3}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '\nTest\n\n');
});

test('column - align text to bottom', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column" justifyContent="flex-end" height={3}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '\n\nTest\n');
});

test('column - align two text nodes on the edges', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column" justifyContent="space-between" height={4}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'A\n\n\nB\n');
});

test('column - align two text nodes with equal space around them', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column" justifyContent="space-around" height={5}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), '\nA\n\nB\n\n');
});
