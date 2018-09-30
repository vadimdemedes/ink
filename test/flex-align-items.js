import React from 'react';
import test from 'ava';
import {Box} from '..';
import Stream from './helpers/stream';
import render from './helpers/render';

test('row - align text to center', t => {
	const stream = new Stream();
	render(
		<Box alignItems="center" height={3}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '\nTest\n\n');
});

test('row - align text to bottom', t => {
	const stream = new Stream();
	render(
		<Box alignItems="flex-end" height={3}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '\n\nTest\n');
});

test('column - align text to center', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column" alignItems="center" width={10}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '   Test\n');
});

test('column - align text to right', t => {
	const stream = new Stream();
	render(
		<Box flexDirection="column" alignItems="flex-end" width={10}>
			Test
		</Box>,
		stream
	);

	t.is(stream.get(), '      Test\n');
});
