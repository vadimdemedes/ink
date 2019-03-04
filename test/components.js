import React, {useState} from 'react';
import test from 'ava';
import chalk from 'chalk';
import {Box, Color, Static} from '..';
import renderToString from './helpers/render-to-string';

test('text', t => {
	const output = renderToString(<Box>Hello World</Box>);

	t.is(output, 'Hello World');
});

test('text with variable', t => {
	const output = renderToString(<Box>Count: {1}</Box>);

	t.is(output, 'Count: 1');
});

test('multiple text nodes', t => {
	const output = renderToString(
		<Box>
			{'Hello'}
			{' World'}
		</Box>
	);

	t.is(output, 'Hello World');
});

test('text with component', t => {
	const World = () => <Box>World</Box>;

	const output = renderToString(
		<Box>
			Hello <World/>
		</Box>
	);

	t.is(output, 'Hello World');
});

test('text with fragment', t => {
	const output = renderToString(
		<Box>
			Hello <React.Fragment>World</React.Fragment>
		</Box>
	);

	t.is(output, 'Hello World');
});

test('number', t => {
	const output = renderToString(<Box>{1}</Box>);

	t.is(output, '1');
});

test('fragment', t => {
	const output = renderToString(<React.Fragment>Hello World</React.Fragment>);

	t.is(output, 'Hello World');
});

test('transform children', t => {
	const output = renderToString(
		<Box unstable__transformChildren={str => `[${str}]`}>
			<Box unstable__transformChildren={str => `{${str}}`}>test</Box>
		</Box>
	);

	t.is(output, '[{test}]');
});

test('apply transform once to multiple text children', t => {
	const output = renderToString(
		<Box unstable__transformChildren={str => `[${str}]`}>
			<Box unstable__transformChildren={str => `{${str}}`}>
				hello{' '}world
			</Box>
		</Box>
	);

	t.is(output, '[{hello world}]');
});

test('hooks', t => {
	const WithHooks = () => {
		const [value] = useState('Hello');

		return (
			<Box>{value}</Box>
		);
	};

	const output = renderToString(<WithHooks/>);
	t.is(output, 'Hello');
});

test('static output', t => {
	const output = renderToString(
		<Box>
			<Static paddingBottom={1}>
				<Box key="a">A</Box>
				<Box key="b">B</Box>
				<Box key="c">C</Box>
			</Static>

			<Box marginTop={1}>
				X
			</Box>
		</Box>
	);

	t.is(output, 'A\nB\nC\n\n\nX');
});

// See https://github.com/chalk/wrap-ansi/issues/27
test('ensure wrap-ansi doesn\'t trim leading whitespace', t => {
	const output = renderToString(
		<Color red>
			{' ERROR '}
		</Color>
	);

	t.is(output, chalk.red(' ERROR '));
});
