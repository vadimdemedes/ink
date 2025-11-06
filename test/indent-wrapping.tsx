import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('preserves indentation when wrapping if there is room', t => {
	const text = 'if (\n    foobarbaz\n)';
	const output = renderToString(
		<Box width={7}>
			<Text wrap="wrap">{text}</Text>
		</Box>,
	);

	t.is(output, 'if (\n\nfoobarb\naz\n)');
});

test('drops indentation when it does not fit', t => {
	const text = 'if (\n    foobarbaz\n)';
	const output = renderToString(
		<Box width={4}>
			<Text wrap="wrap">{text}</Text>
		</Box>,
	);

	t.is(output, 'if (\n\nfoob\narba\nz\n)');
});

test('preserves just indentation', t => {
	const output = renderToString(
		<Box width={4}>
			<Text> </Text>
		</Box>,
	);
	t.is(output, '');
});

test('preserves just indentation no box', t => {
	const output = renderToString(<Text> </Text>);
	t.is(output, '');
});
