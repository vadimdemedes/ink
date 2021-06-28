import React from 'react';
import test from 'ava';
import {renderToString} from './helpers/render-to-string';
import {Box, Text} from '../src';

test('overflow y', t => {
	const output = renderToString(
		<Box overflow="hidden" height={1}>
			<Text>Line 1{'\n'}Line 2</Text>
		</Box>
	);

	t.is(output, 'Line 1');
});

test('overflow x', t => {
	const output = renderToString(
		<Box overflow="hidden" width={3}>
			<Box marginRight={-3} width={6} height={1}>
				<Text>123456</Text>
			</Box>
		</Box>
	);

	t.is(output, '123');
});

test('nested boxes with overflow hidden', t => {
	const output = renderToString(
		<Box overflow="hidden" width={3}>
			<Box overflow="hidden" marginRight={-3} width={6} height={1}>
				<Text>Line 1{'\n'}Line 2</Text>
			</Box>
		</Box>
	);

	t.is(output, 'Lin');
});
