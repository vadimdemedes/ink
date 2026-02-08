import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('display flex', t => {
	const output = renderToString(
		<Box display="flex">
			<Text>X</Text>
		</Box>,
	);
	t.is(output, 'X');
});

test('display none', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box display="none">
				<Text>Kitty!</Text>
			</Box>
			<Text>Doggo</Text>
		</Box>,
	);

	t.is(output, 'Doggo');
});

// Concurrent mode tests
test('display flex - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box display="flex">
			<Text>X</Text>
		</Box>,
	);
	t.is(output, 'X');
});

test('display none - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box flexDirection="column">
			<Box display="none">
				<Text>Kitty!</Text>
			</Box>
			<Text>Doggo</Text>
		</Box>,
	);

	t.is(output, 'Doggo');
});
