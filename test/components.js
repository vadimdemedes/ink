import React from 'react';
import test from 'ava';
import {Box} from '..';
import Stream from './helpers/stream';
import render from './helpers/render';

test('text', t => {
	const stream = new Stream();
	render(<Box>Hello World</Box>, stream);

	t.is(stream.get(), 'Hello World\n');
});

test('text with variable', t => {
	const stream = new Stream();
	render(<Box>Count: {1}</Box>, stream);

	t.is(stream.get(), 'Count: 1\n');
});

test('multiple text nodes', t => {
	const stream = new Stream();
	render(
		<Box>
			{'Hello'}
			{' World'}
		</Box>,
		stream
	);

	t.is(stream.get(), 'Hello World\n');
});

test('text with component', t => {
	const World = () => <Box>World</Box>;

	const stream = new Stream();
	render(
		<Box>
			Hello <World/>
		</Box>,
		stream
	);

	t.is(stream.get(), 'Hello World\n');
});

test('text with fragment', t => {
	const stream = new Stream();
	render(
		<Box>
			Hello <React.Fragment>World</React.Fragment>
		</Box>,
		stream
	);

	t.is(stream.get(), 'Hello World\n');
});

test('fragment', t => {
	const stream = new Stream();
	render(<React.Fragment>Hello World</React.Fragment>, stream);

	t.is(stream.get(), 'Hello World\n');
});

test('transform children', t => {
	const stream = new Stream();
	render(
		<Box unstable__transformChildren={str => `[${str}]`}>
			<Box unstable__transformChildren={str => `{${str}}`}>test</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), '[{t}][{e}][{s}][{t}]\n');
});
