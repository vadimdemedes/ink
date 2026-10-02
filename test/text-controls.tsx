import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, renderToString} from '../src/index.js';
import sanitizeAnsi from '../src/sanitize-ansi.js';

for (const control of ['\r', '\b', '\v', '\f']) {
	test(`text removes cursor control ${JSON.stringify(control)}`, (t: TestContext) => {
		const output = renderToString(
			<Box borderStyle="single" width={6}>
				<Text>{`a${control}b`}</Text>
			</Box>,
		);

		t.assert.strictEqual(output, '┌────┐\n│ab  │\n└────┘');
	});
}

for (const [name, control] of [
	['NUL', '\u{0}'],
	['SOH', '\u{1}'],
	['BEL', '\u{7}'],
	['SUB', '\u{1A}'],
	['US', '\u{1F}'],
	['DEL', '\u{7F}'],
]) {
	test(`text removes ${name} inside a bordered box`, (t: TestContext) => {
		const output = renderToString(
			<Box borderStyle="single" width={6}>
				<Text>{`a${control}b`}</Text>
			</Box>,
		);

		t.assert.strictEqual(output, '┌────┐\n│ab  │\n└────┘');
	});

	test(`text with ${name} keeps the sibling in the next column`, (t: TestContext) => {
		const output = renderToString(
			<Box>
				<Box width={10}>
					<Text>{`a${control}b`}</Text>
				</Box>
				<Text>|</Text>
			</Box>,
		);

		t.assert.strictEqual(output, 'ab        |');
	});

	test(`sanitizeAnsi strips ${name}`, (t: TestContext) => {
		t.assert.strictEqual(sanitizeAnsi(`a${control}b`), 'ab');
	});
}

test('sanitizing cursor controls preserves tabs, newlines, and styles', (t: TestContext) => {
	t.assert.strictEqual(
		sanitizeAnsi('[31ma\rb\bc\vd\fe\t\nf[0m'),
		'[31mabcde\t\nf[0m',
	);
});

test('cursor controls inside OSC payloads remain untouched', (t: TestContext) => {
	const hyperlink = ']8;;https://example.com/\rpath';
	t.assert.strictEqual(
		sanitizeAnsi(`${hyperlink}a\rb]8;;`),
		`${hyperlink}ab]8;;`,
	);
});
