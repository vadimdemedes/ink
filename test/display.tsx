import React from 'react';
import test from 'ava';
import {renderToString} from './helpers/render-to-string';
import {Box} from '../src';

test('display flex', t => {
	const output = renderToString(<Box display="flex">X</Box>);
	t.is(output, 'X');
});

test('display none', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box display="none">Kitty!</Box>
			<Box>Doggo</Box>
		</Box>
	);

	t.is(output, 'Doggo');
});
