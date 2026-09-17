import React from 'react';
import test from 'ava';
import {Box, Text, renderToString} from '../src/index.js';
import sanitizeAnsi from '../src/sanitize-ansi.js';

for (const control of ['\r', '\b', '\v', '\f']) {
	test(`text removes cursor control ${JSON.stringify(control)}`, t => {
		const output = renderToString(
			<Box borderStyle="single" width={6}>
				<Text>{`a${control}b`}</Text>
			</Box>,
		);

		t.is(output, '┌────┐\n│ab  │\n└────┘');
	});
}

test('sanitizing cursor controls preserves tabs, newlines, and styles', t => {
	t.is(sanitizeAnsi('[31ma\rb\bc\vd\fe\t\nf[0m'), '[31mabcde\t\nf[0m');
});

test('cursor controls inside OSC payloads remain untouched', t => {
	const hyperlink = ']8;;https://example.com/\rpath';
	t.is(sanitizeAnsi(`${hyperlink}a\rb]8;;`), `${hyperlink}ab]8;;`);
});
