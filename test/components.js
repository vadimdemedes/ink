import React from 'react';
import test from 'ava';
import {Box, renderToString} from '..';

test('text', t => {
	const output = renderToString(<Box>Hello World</Box>);

	t.is(output, 'Hello World\n');
});

test('text with variable', t => {
	const output = renderToString(<Box>Count: {1}</Box>);

	t.is(output, 'Count: 1\n');
});

test('multiple text nodes', t => {
	const output = renderToString(
		<Box>
			{'Hello'}
			{' World'}
		</Box>
	);

	t.is(output, 'Hello World\n');
});

test('text with component', t => {
	const World = () => <Box>World</Box>;

	const output = renderToString(
		<Box>
			Hello <World/>
		</Box>
	);

	t.is(output, 'Hello World\n');
});

test('text with fragment', t => {
	const output = renderToString(
		<Box>
			Hello <React.Fragment>World</React.Fragment>
		</Box>
	);

	t.is(output, 'Hello World\n');
});

test('fragment', t => {
	const output = renderToString(<React.Fragment>Hello World</React.Fragment>);

	t.is(output, 'Hello World\n');
});

test('transform children', t => {
	const output = renderToString(
		<Box unstable__transformChildren={str => `[${str}]`}>
			<Box unstable__transformChildren={str => `{${str}}`}>test</Box>
		</Box>
	);

	t.is(output, '[{t}][{e}][{s}][{t}]\n');
});
