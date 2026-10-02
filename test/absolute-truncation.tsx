import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, renderToString} from '../src/index.js';

for (const wrap of [
	'truncate',
	'truncate-start',
	'truncate-middle',
	'truncate-end',
] as const) {
	test(`${wrap} renders text in an absolute box without an explicit width`, (t: TestContext) => {
		const output = renderToString(
			<Box height={2}>
				<Box position="absolute">
					<Text wrap={wrap}>hello</Text>
				</Box>
			</Box>,
		);

		t.assert.strictEqual(output, 'hello\n');
	});
}
