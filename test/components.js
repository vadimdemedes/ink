import React from 'react';
import test from 'ava';
import {Box, Static, renderToString} from '..';

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

test('static output', t => {
	const output = renderToString(
		<Box>
			<Static>
				<Box paddingBottom={1} flexDirection="column">
					<Box>A</Box>
					<Box>B</Box>
					<Box>C</Box>
				</Box>
			</Static>

			<Box marginTop={1}>
				X
			</Box>
		</Box>
	);

	t.is(output, 'A\nB\nC\n\n\nX');
});
