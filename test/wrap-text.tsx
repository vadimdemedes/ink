import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text} from '../src/index.js';
import wrapText, {wrapTextCache} from '../src/wrap-text.js';
import {renderToString} from './helpers/render-to-string.js';
import {renderAsync} from './helpers/test-renderer.js';

test('changing text wrapping recalculates the container height', async (t: TestContext) => {
	function Example({truncate}: {readonly truncate: boolean}) {
		return (
			<Box width={7} borderStyle="single">
				<Text wrap={truncate ? 'truncate' : 'wrap'}>abcdefghij</Text>
			</Box>
		);
	}

	const {getOutput, rerenderAsync, unmount} = await renderAsync(
		<Example truncate={false} />,
	);
	t.after(() => {
		unmount();
	});
	t.assert.strictEqual(getOutput(), '┌─────┐\n│abcde│\n│fghij│\n└─────┘');

	await rerenderAsync(<Example truncate />);
	t.assert.strictEqual(getOutput(), '┌─────┐\n│abcd…│\n└─────┘');

	await rerenderAsync(<Example truncate={false} />);
	t.assert.strictEqual(getOutput(), '┌─────┐\n│abcde│\n│fghij│\n└─────┘');
});

test('wraps text', (t: TestContext) => {
	t.assert.strictEqual(wrapText('hello world', 5, 'wrap'), 'hello\n \nworld');
});

test('truncates text at the end', (t: TestContext) => {
	t.assert.strictEqual(wrapText('hello world', 5, 'truncate-end'), 'hell…');
});

test('truncates each line of multi-line text separately', (t: TestContext) => {
	t.assert.strictEqual(
		wrapText('hello world\nfoo', 6, 'truncate-end'),
		'hello…\nfoo',
	);
	t.assert.strictEqual(
		wrapText('foo\nhello world', 6, 'truncate-end'),
		'foo\nhello…',
	);
	t.assert.strictEqual(
		wrapText('ab\ncdefgh\nij', 4, 'truncate-end'),
		'ab\ncde…\nij',
	);
	t.assert.strictEqual(
		wrapText('hello world\nfoo', 6, 'truncate-middle'),
		'hel…ld\nfoo',
	);
	t.assert.strictEqual(
		wrapText('hello world\nfoo', 6, 'truncate-start'),
		'…world\nfoo',
	);
});

test('truncated multi-line text keeps styles that span a newline', (t: TestContext) => {
	t.assert.strictEqual(
		wrapText('\u{1B}[31mabcdef\nuvwxyz\u{1B}[39m', 4, 'truncate-end'),
		'\u{1B}[31mabc…\u{1B}[39m\n\u{1B}[31muvw…\u{1B}[39m',
	);

	const link = '\u{1B}]8;;https://example.com\u{7}';
	const linkEnd = '\u{1B}]8;;\u{7}';
	t.assert.strictEqual(
		wrapText(`${link}abcdef\nuvwxyz${linkEnd}`, 4, 'truncate-end'),
		`${link}abc${linkEnd}…\n${link}uvw${linkEnd}…`,
	);
});

test('truncated multi-line text keeps its lines in the layout', (t: TestContext) => {
	const output = renderToString(
		<Box width={8} borderStyle="single">
			<Text wrap="truncate">{'hello world\nfoo'}</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '┌──────┐\n│hello…│\n│foo   │\n└──────┘');
});

// The C1 and colon forms reach `wrapText` already normalized by `squashTextNodes`, so this checks the whole pipeline rather than `wrapText` alone.
for (const [name, text, expected] of [
	[
		'C1 SGR color',
		'\u{9B}31mabcdef\nuvwxyz\u{9B}39m',
		'\u{1B}[31mabc…\u{1B}[39m\n\u{1B}[31muvw…\u{1B}[39m',
	],
	[
		'C1 OSC hyperlink',
		'\u{9D}8;;https://example.com\u{9C}abcdef\nuvwxyz\u{9D}8;;\u{9C}',
		'\u{1B}]8;;https://example.com\u{1B}\\abc\u{1B}]8;;\u{1B}\\…\n\u{1B}]8;;https://example.com\u{1B}\\uvw\u{1B}]8;;\u{1B}\\…',
	],
	[
		'colon 256-color',
		'\u{1B}[38:5:196mabcdef\nuvwxyz\u{1B}[39m',
		'\u{1B}[38;5;196mabc…\u{1B}[39m\n\u{1B}[38;5;196muvw…\u{1B}[39m',
	],
	[
		'colon truecolor',
		'\u{1B}[38:2::255:0:0mabcdef\nuvwxyz\u{1B}[39m',
		'\u{1B}[38;2;255;0;0mabc…\u{1B}[39m\n\u{1B}[38;2;255;0;0muvw…\u{1B}[39m',
	],
] as const) {
	test(`truncated multi-line text keeps a ${name} that spans a newline`, (t: TestContext) => {
		const output = renderToString(
			<Box width={4}>
				<Text wrap="truncate">{text}</Text>
			</Box>,
		);

		t.assert.strictEqual(output, expected);
	});
}

test('keeps text at its natural width when there is no room to wrap', (t: TestContext) => {
	t.assert.strictEqual(wrapText('hello', 0, 'wrap'), 'hello');
	t.assert.strictEqual(wrapText('hello', 0, 'hard'), 'hello');
	t.assert.strictEqual(wrapText('hello', -1, 'wrap'), 'hello');
});

test('wraps a fraction of a column like one column', (t: TestContext) => {
	t.assert.strictEqual(wrapText('hello', 0.5, 'wrap'), 'h\ne\nl\nl\no');
	t.assert.strictEqual(wrapText('hello', 0.5, 'hard'), 'h\ne\nl\nl\no');
});

test('leaves truncation at zero columns alone', (t: TestContext) => {
	t.assert.strictEqual(wrapText('hello', 0, 'truncate'), '');
});

test('uses separate cache entries for different widths', (t: TestContext) => {
	t.assert.strictEqual(wrapText('hello world', 5, 'truncate-end'), 'hell…');
	t.assert.strictEqual(wrapText('hello world', 8, 'truncate-end'), 'hello w…');
});

test('evicts old cached results', (t: TestContext) => {
	const cacheKey = '5\u{0}truncate-end\u{0}cache-test-first';
	wrapTextCache.clear();
	wrapText('cache-test-first', 5, 'truncate-end');

	for (let index = 0; index < 8192; index++) {
		wrapText(`cache-test-${index}`, 5, 'truncate-end');
	}

	t.assert.strictEqual(wrapTextCache.has(cacheKey), false);
});

test('uses separate cache entries for texts that end with digits', (t: TestContext) => {
	wrapTextCache.clear();

	t.assert.strictEqual(wrapText('ab', 12, 'wrap'), 'ab');
	t.assert.strictEqual(wrapText('ab1', 2, 'wrap'), 'ab\n1');
});

test('does not reuse a cached result from a wider box', (t: TestContext) => {
	wrapTextCache.clear();

	renderToString(
		<Box width={15}>
			<Text>一二三四五六七八九十</Text>
		</Box>,
	);

	const output = renderToString(
		<Box width={5}>
			<Text>一二三四五六七八九十1</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '一二\n三四\n五六\n七八\n九十1');
});
