import React from 'react';
import test from 'ava';
import {renderToString} from './helpers/render-to-string';
import {Box} from '../src';

test('margin', t => {
	const output = renderToString(<Box margin={2}>X</Box>);

	t.is(output, '\n\n  X\n\n');
});

test('margin X', t => {
	const output = renderToString(
		<Box>
			<Box marginX={2}>X</Box>Y
		</Box>
	);

	t.is(output, '  X  Y');
});

test('margin Y', t => {
	const output = renderToString(<Box marginY={2}>X</Box>);

	t.is(output, '\n\nX\n\n');
});

test('margin top', t => {
	const output = renderToString(<Box marginTop={2}>X</Box>);

	t.is(output, '\n\nX');
});

test('margin bottom', t => {
	const output = renderToString(<Box marginBottom={2}>X</Box>);

	t.is(output, 'X\n\n');
});

test('margin left', t => {
	const output = renderToString(<Box marginLeft={2}>X</Box>);

	t.is(output, '  X');
});

test('margin right', t => {
	const output = renderToString(
		<Box>
			<Box marginRight={2}>X</Box>Y
		</Box>
	);

	t.is(output, 'X  Y');
});

test('nested margin', t => {
	const output = renderToString(
		<Box margin={2}>
			<Box margin={2}>X</Box>
		</Box>
	);

	t.is(output, '\n\n\n\n    X\n\n\n\n');
});

test('margin with multiline string', t => {
	const output = renderToString(<Box margin={2}>{'A\nB'}</Box>);

	t.is(output, '\n\n  A\n  B\n\n');
});
