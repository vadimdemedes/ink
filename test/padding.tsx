import React from 'react';
import test from 'ava';
import {renderToString} from './helpers/render-to-string';
import {Box} from '../src';

test('padding', t => {
	const output = renderToString(<Box padding={2}>X</Box>);

	t.is(output, '\n\n  X\n\n');
});

test('padding X', t => {
	const output = renderToString(
		<Box>
			<Box paddingX={2}>X</Box>Y
		</Box>
	);

	t.is(output, '  X  Y');
});

test('padding Y', t => {
	const output = renderToString(<Box paddingY={2}>X</Box>);

	t.is(output, '\n\nX\n\n');
});

test('padding top', t => {
	const output = renderToString(<Box paddingTop={2}>X</Box>);

	t.is(output, '\n\nX');
});

test('padding bottom', t => {
	const output = renderToString(<Box paddingBottom={2}>X</Box>);

	t.is(output, 'X\n\n');
});

test('padding left', t => {
	const output = renderToString(<Box paddingLeft={2}>X</Box>);

	t.is(output, '  X');
});

test('padding right', t => {
	const output = renderToString(
		<Box>
			<Box paddingRight={2}>X</Box>Y
		</Box>
	);

	t.is(output, 'X  Y');
});

test('nested padding', t => {
	const output = renderToString(
		<Box padding={2}>
			<Box padding={2}>X</Box>
		</Box>
	);

	t.is(output, '\n\n\n\n    X\n\n\n\n');
});

test('padding with multiline string', t => {
	const output = renderToString(<Box padding={2}>{'A\nB'}</Box>);

	t.is(output, '\n\n  A\n  B\n\n');
});
