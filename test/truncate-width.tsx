import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, renderToString} from '../src/index.js';

for (const [wrap, expected] of [
	['truncate', '你…'],
	['truncate-end', '你…'],
	['truncate-middle', '你…'],
	['truncate-start', '…界'],
] as const) {
	test(`${wrap} keeps wide characters that fit`, (t: TestContext) => {
		const output = renderToString(
			<Box width={4}>
				<Text wrap={wrap}>你好世界</Text>
			</Box>,
		);

		t.assert.strictEqual(output, expected);
	});

	test(`${wrap} preserves the adjacent column`, (t: TestContext) => {
		const output = renderToString(
			<Box width={5}>
				<Text wrap={wrap}>你好世界</Text>
				<Box flexShrink={0}>
					<Text>|</Text>
				</Box>
			</Box>,
		);

		t.assert.strictEqual(output, `${expected} |`);
	});
}

test('text that fits does not reserve extra width', (t: TestContext) => {
	const output = renderToString(
		<Box width={10}>
			<Text wrap="truncate-middle">你好</Text>
			<Text>|</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '你好|');
});
