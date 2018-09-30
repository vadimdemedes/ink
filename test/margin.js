import React from 'react';
import test from 'ava';
import {Box} from '..';
import Stream from './helpers/stream';
import render from './helpers/render';

test('margin', t => {
	const stream = new Stream();
	render(<Box margin={2}>X</Box>, stream);

	t.is(stream.get(), '\n\n  X\n\n\n');
});

test('margin X', t => {
	const stream = new Stream();
	render(
		<Box>
			<Box marginX={2}>X</Box>Y
		</Box>,
		stream
	);

	t.is(stream.get(), '  X  Y\n');
});

test('margin Y', t => {
	const stream = new Stream();
	render(<Box marginY={2}>X</Box>, stream);

	t.is(stream.get(), '\n\nX\n\n\n');
});

test('margin top', t => {
	const stream = new Stream();
	render(<Box marginTop={2}>X</Box>, stream);

	t.is(stream.get(), '\n\nX\n');
});

test('margin bottom', t => {
	const stream = new Stream();
	render(<Box marginBottom={2}>X</Box>, stream);

	t.is(stream.get(), 'X\n\n\n');
});

test('margin left', t => {
	const stream = new Stream();
	render(<Box marginLeft={2}>X</Box>, stream);

	t.is(stream.get(), '  X\n');
});

test('margin right', t => {
	const stream = new Stream();
	render(
		<Box>
			<Box marginRight={2}>X</Box>Y
		</Box>,
		stream
	);

	t.is(stream.get(), 'X  Y\n');
});

test('nested margin', t => {
	const stream = new Stream();
	render(
		<Box margin={2}>
			<Box margin={2}>X</Box>
		</Box>,
		stream
	);

	t.is(stream.get(), '\n\n\n\n    X\n\n\n\n\n');
});

test('margin with multiline string', t => {
	const stream = new Stream();
	render(<Box margin={2}>{'A\nB'}</Box>, stream);

	t.is(stream.get(), '\n\n  A\n  B\n\n\n');
});
