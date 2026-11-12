import test, {type TestContext} from 'node:test';
import React from 'react';
import ansiEscapes from 'ansi-escapes';
import {Box, Text, render, renderToString} from '../src/index.js';
import sanitizeAnsi from '../src/sanitize-ansi.js';
import createStdout from './helpers/create-stdout.js';

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

test('a hyperlink with a cursor control in its URI is dropped', (t: TestContext) => {
	const hyperlink = ']8;;https://example.com/\rpath';
	t.assert.strictEqual(sanitizeAnsi(`${hyperlink}a\rb]8;;`), 'ab]8;;');
});

const lineFeedHyperlink =
	'\u{1B}]8;;https://example.com/\n\u{7}link\u{1B}]8;;\u{7}';

for (const [name, incrementalRendering, update] of [
	['standard', false, ansiEscapes.eraseLines(2) + 'link 1\n'],
	[
		'incremental',
		true,
		ansiEscapes.cursorUp(1) +
			ansiEscapes.cursorTo(5) +
			ansiEscapes.eraseEndLine +
			'1\n',
	],
] as const) {
	test(`a hyperlink with a line feed in its URI takes one row in ${name} rendering`, async (t: TestContext) => {
		const stdout = createStdout(40, true);
		const instance = render(<Text>{lineFeedHyperlink} 0</Text>, {
			stdout,
			interactive: true,
			incrementalRendering,
			patchConsole: false,
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		instance.rerender(<Text>{lineFeedHyperlink} 1</Text>);
		await instance.waitUntilRenderFlush();

		// The terminal ignores the line feed, so with the hyperlink kept Ink would count two rows and erase the row above its output.
		t.assert.deepStrictEqual(
			stdout.getWrites().filter(write => write.endsWith('\n')),
			['link 0\n', update],
		);
	});
}

test('a hyperlink with DEL in its URI wraps as plain text', (t: TestContext) => {
	const output = renderToString(
		<Box width={12}>
			<Text>
				{
					'\u{1B}]8;;AAAAAAAA\u{7F}\u{7}visible text that has to wrap around\u{1B}]8;;\u{7}'
				}
			</Text>
		</Box>,
	);

	// `wrap-ansi` does not see a hyperlink with DEL in it as a sequence, so it would wrap inside the URI.
	t.assert.strictEqual(output, 'visible text\n that has to\n wrap around');
});

test('text does not let an OSC hyperlink smuggle escape sequences to the terminal', (t: TestContext) => {
	const output = renderToString(
		<Text>
			{'\u{1B}]8;;\u{1B}]52;c;SGVsbG8=\u{7}\u{7}a\u{1B}]8;;\u{9B}2J\u{7}b'}
		</Text>,
	);

	t.assert.strictEqual(output, 'ab');
});
