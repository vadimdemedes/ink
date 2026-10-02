import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, renderToString} from '../src/index.js';

for (const [name, encoded, standard] of [
	['color', '31mred0m', '[31mred[0m'],
	[
		'hyperlink',
		'8;;https://example.comlink8;;',
		']8;;https://example.com\\link]8;;\\',
	],
	[
		'hyperlink with BEL terminators',
		'8;;https://example.comlink8;;',
		']8;;https://example.comlink]8;;',
	],
	['mixed color encodings', '[31mred0m', '[31mred[0m'],
] as const) {
	for (const width of [4, 8]) {
		test(`C1 ${name} preserves layout and styling at width ${width}`, (t: TestContext) => {
			const output = (text: string) =>
				renderToString(
					<Box width={width} borderStyle="single">
						<Text>{text}</Text>
					</Box>,
				);

			t.assert.strictEqual(output(encoded), output(standard));
		});
	}
}
