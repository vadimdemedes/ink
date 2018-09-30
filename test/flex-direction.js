import React from 'react';
import test from 'ava';
import {Box} from '..';
import Stream from './helpers/stream';
import render from './helpers/render';

test('direction row', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="row">
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'AB\n');
});

test('direction row reverse', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="row-reverse" width={4}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), '  BA\n');
});

test('direction column', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column">
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'A\nB\n');
});

test('direction column reverse', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column-reverse" height={4}>
			<Box>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), '\n\nB\nA\n');
});
