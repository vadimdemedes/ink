import React from 'react';
import test from 'ava';
import {Box, Text, renderToString} from '../src/index.js';

for (const wrap of [
	'truncate',
	'truncate-start',
	'truncate-middle',
	'truncate-end',
] as const) {
	test(`${wrap} renders text in an absolute box without an explicit width`, t => {
		const output = renderToString(
			<Box height={2}>
				<Box position="absolute">
					<Text wrap={wrap}>hello</Text>
				</Box>
			</Box>,
		);

		t.is(output, 'hello\n');
	});
}
