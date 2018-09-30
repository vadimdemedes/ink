import React from 'react';
import test from 'ava';
import {Box} from '..';
import Stream from './helpers/stream';
import render from './helpers/render';

test('padding', t => {
	const stream = new Stream();
	render(<Box padding={2}>X</Box>, stream);

	t.is(stream.get(), '\n\n  X\n\n\n');
});

test('padding X', t => {
	const stream = new Stream();
	render(
		<Box>
			<Box paddingX={2}>X</Box>Y
		</Box>,
		stream
	);

	t.is(stream.get(), '  X  Y\n');
});

test('padding Y', t => {
	const stream = new Stream();
	render(<Box paddingY={2}>X</Box>, stream);

	t.is(stream.get(), '\n\nX\n\n\n');
});

test('padding top', t => {
	const stream = new Stream();
	render(<Box paddingTop={2}>X</Box>, stream);

	t.is(stream.get(), '\n\nX\n');
});

test('padding bottom', t => {
	const stream = new Stream();
	render(<Box paddingBottom={2}>X</Box>, stream);

	t.is(stream.get(), 'X\n\n\n');
});

test('padding left', t => {
	const stream = new Stream();
	render(<Box paddingLeft={2}>X</Box>, stream);

	t.is(stream.get(), '  X\n');
});

test('padding right', t => {
	const stream = new Stream();
	render(
		<Box>
			<Box paddingRight={2}>X</Box>Y
		</Box>,
		stream
	);

	t.is(stream.get(), 'X  Y\n');
});

test('nested padding', t => {
	const stream = new Stream();
	render(
		<Box padding={2}>
			<Box padding={2}>X</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), '\n\n\n\n    X\n\n\n\n\n');
});

test('padding with multiline string', t => {
	const stream = new Stream();
	render(<Box padding={2}>{'A\nB'}</Box>, stream);

	t.is(stream.get(), '\n\n  A\n  B\n\n\n');
});
