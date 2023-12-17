import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

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
