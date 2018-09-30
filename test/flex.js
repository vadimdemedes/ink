import React from 'react';
import test from 'ava';
import {Box} from '..';
import Stream from './helpers/stream';
import render from './helpers/render';

test('grow equally', t => {
	const stream = new Stream();
	render(
		<Box width={6}>
			<Box flexGrow={1}>A</Box>
			<Box flexGrow={1}>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'A  B\n');
});

test('grow one element', t => {
	const stream = new Stream();
	render(
		<Box width={6}>
			<Box flexGrow={1}>A</Box>
			<Box>B</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'A    B\n');
});

test('dont shrink', t => {
	const stream = new Stream();
	render(
		<Box width={10}>
			<Box flexShrink={0} width={6}>
				A
			</Box>
			<Box flexShrink={0} width={6}>
				B
			</Box>
			<Box>C</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'A     B     C\n');
});

test('shrink equally', t => {
	const stream = new Stream();
	render(
		<Box width={10}>
			<Box flexShrink={1} width={6}>
				A
			</Box>
			<Box flexShrink={1} width={6}>
				B
			</Box>
			<Box>C</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), 'A    B   C\n');
});
