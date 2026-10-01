import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, renderToString} from '../src/index.js';

for (const [name, open, close] of [
	['foreground', '[31m', '[39m'],
	['background', '[44m', '[49m'],
	['bold', '[1m', '[22m'],
] as const) {
	test(`raw ANSI ${name} continues across explicit newlines`, (t: TestContext) => {
		const actual = renderToString(<Text>{`${open}A\nB${close}`}</Text>);
		const expected = renderToString(
			<Text>{`${open}A${close}\n${open}B${close}`}</Text>,
		);
		t.assert.strictEqual(actual, expected);
	});

	test(`raw ANSI ${name} survives blank lines and vertical clipping`, (t: TestContext) => {
		const actual = renderToString(
			<Box height={1} overflow="hidden" contentOffsetY={2}>
				<Text>{`${open}A\n\nB${close}`}</Text>
			</Box>,
		);
		t.assert.strictEqual(
			actual,
			renderToString(<Text>{`${open}B${close}`}</Text>),
		);
	});

	test(`raw ANSI ${name} stops at a reset on a later line`, (t: TestContext) => {
		const actual = renderToString(<Text>{`${open}A\nB${close}\nC`}</Text>);
		const expected = renderToString(
			<Text>{`${open}A${close}\n${open}B${close}\nC`}</Text>,
		);
		t.assert.strictEqual(actual, expected);
	});
}
