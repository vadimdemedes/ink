import React from 'react';
import test from 'ava';
import {renderToString} from './helpers/render-to-string';
import {Box, Text} from '../src';

test('transform children of <Box>', t => {
	const output = renderToString(
		<Box unstable__transformChildren={(string: string) => `[${string}]`}>
			<Box unstable__transformChildren={(string: string) => `{${string}}`}>
				<Text>test</Text>
			</Box>
		</Box>
	);

	t.is(output, '[{test}]');
});

test('transform children of <Text>', t => {
	const output = renderToString(
		<Text unstable__transformChildren={(string: string) => `[${string}]`}>
			<Text unstable__transformChildren={(string: string) => `{${string}}`}>
				test
			</Text>
		</Text>
	);

	t.is(output, '[{test}]');
});

test('squash multiple text nodes', t => {
	const output = renderToString(
		<Box unstable__transformChildren={(string: string) => `[${string}]`}>
			<Box unstable__transformChildren={(string: string) => `{${string}}`}>
				<Text>hello world</Text>
			</Box>
		</Box>
	);

	t.is(output, '[{hello world}]');
});

test('squash multiple nested text nodes', t => {
	const output = renderToString(
		<Box unstable__transformChildren={(string: string) => `[${string}]`}>
			<Box unstable__transformChildren={(string: string) => `{${string}}`}>
				<Text>hello{' world'}</Text>
			</Box>
		</Box>
	);

	t.is(output, '[{hello world}]');
});

test('squash empty `<Text>` nodes', t => {
	const output = renderToString(
		<Box unstable__transformChildren={(string: string) => `[${string}]`}>
			<Box unstable__transformChildren={(string: string) => `{${string}}`}>
				<Text>{[]}</Text>
			</Box>
		</Box>
	);

	t.is(output, '');
});
