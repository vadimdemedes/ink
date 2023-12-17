import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('padding', t => {
	const output = renderToString(
		<Box padding={2}>
			<Text>X</Text>
		</Box>,
	);

	t.is(output, '\n\n  X\n\n');
});

test('padding X', t => {
	const output = renderToString(
		<Box>
			<Box paddingX={2}>
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.is(output, '  X  Y');
});

test('padding Y', t => {
	const output = renderToString(
		<Box paddingY={2}>
			<Text>X</Text>
		</Box>,
	);

	t.is(output, '\n\nX\n\n');
});

test('padding top', t => {
	const output = renderToString(
		<Box paddingTop={2}>
			<Text>X</Text>
		</Box>,
	);

	t.is(output, '\n\nX');
});

test('padding bottom', t => {
	const output = renderToString(
		<Box paddingBottom={2}>
			<Text>X</Text>
		</Box>,
	);

	t.is(output, 'X\n\n');
});

test('padding left', t => {
	const output = renderToString(
		<Box paddingLeft={2}>
			<Text>X</Text>
		</Box>,
	);

	t.is(output, '  X');
});

test('padding right', t => {
	const output = renderToString(
		<Box>
			<Box paddingRight={2}>
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.is(output, 'X  Y');
});

test('nested padding', t => {
	const output = renderToString(
		<Box padding={2}>
			<Box padding={2}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n\n\n\n    X\n\n\n\n');
});

test('padding with multiline string', t => {
	const output = renderToString(
		<Box padding={2}>
			<Text>{'A\nB'}</Text>
		</Box>,
	);

	t.is(output, '\n\n  A\n  B\n\n');
});

test('apply padding to text with newlines', t => {
	const output = renderToString(
		<Box padding={1}>
			<Text>Hello{'\n'}World</Text>
		</Box>,
	);
	t.is(output, '\n Hello\n World\n');
});

test('apply padding to wrapped text', t => {
	const output = renderToString(
		<Box padding={1} width={5}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, '\n Hel\n lo\n Wor\n ld\n');
});
