import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import wrapText, {wrapTextCache} from '../src/wrap-text.js';
import {renderToString} from './helpers/render-to-string.js';
import {renderAsync} from './helpers/test-renderer.js';

test('changing text wrapping recalculates the container height', async t => {
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
	t.teardown(unmount);
	t.is(getOutput(), '┌─────┐\n│abcde│\n│fghij│\n└─────┘');

	await rerenderAsync(<Example truncate />);
	t.is(getOutput(), '┌─────┐\n│abcd…│\n└─────┘');

	await rerenderAsync(<Example truncate={false} />);
	t.is(getOutput(), '┌─────┐\n│abcde│\n│fghij│\n└─────┘');
});

test('wraps text', t => {
	t.is(wrapText('hello world', 5, 'wrap'), 'hello\n \nworld');
});

test('truncates text at the end', t => {
	t.is(wrapText('hello world', 5, 'truncate-end'), 'hell…');
});

test('truncates each line of multi-line text separately', t => {
	t.is(wrapText('hello world\nfoo', 6, 'truncate-end'), 'hello…\nfoo');
	t.is(wrapText('foo\nhello world', 6, 'truncate-end'), 'foo\nhello…');
	t.is(wrapText('ab\ncdefgh\nij', 4, 'truncate-end'), 'ab\ncde…\nij');
	t.is(wrapText('hello world\nfoo', 6, 'truncate-middle'), 'hel…ld\nfoo');
	t.is(wrapText('hello world\nfoo', 6, 'truncate-start'), '…world\nfoo');
});

test('truncated multi-line text keeps styles that span a newline', t => {
	t.is(
		wrapText('\u001B[31mabcdef\nuvwxyz\u001B[39m', 4, 'truncate-end'),
		'\u001B[31mabc…\u001B[39m\n\u001B[31muvw…\u001B[39m',
	);

	const link = '\u001B]8;;https://example.com\u0007';
	const linkEnd = '\u001B]8;;\u0007';
	t.is(
		wrapText(`${link}abcdef\nuvwxyz${linkEnd}`, 4, 'truncate-end'),
		`${link}abc${linkEnd}…\n${link}uvw${linkEnd}…`,
	);
});

test('truncated multi-line text keeps its lines in the layout', t => {
	const output = renderToString(
		<Box width={8} borderStyle="single">
			<Text wrap="truncate">{'hello world\nfoo'}</Text>
		</Box>,
	);

	t.is(output, '┌──────┐\n│hello…│\n│foo   │\n└──────┘');
});

// The C1 and colon forms reach `wrapText` already normalized by `squashTextNodes`, so this checks the whole pipeline rather than `wrapText` alone.
for (const [name, text, expected] of [
	[
		'C1 SGR color',
		'\u009B31mabcdef\nuvwxyz\u009B39m',
		'\u001B[31mabc…\u001B[39m\n\u001B[31muvw…\u001B[39m',
	],
	[
		'C1 OSC hyperlink',
		'\u009D8;;https://example.com\u009Cabcdef\nuvwxyz\u009D8;;\u009C',
		'\u001B]8;;https://example.com\u001B\\abc\u001B]8;;\u001B\\…\n\u001B]8;;https://example.com\u001B\\uvw\u001B]8;;\u001B\\…',
	],
	[
		'colon 256-color',
		'\u001B[38:5:196mabcdef\nuvwxyz\u001B[39m',
		'\u001B[38;5;196mabc…\u001B[39m\n\u001B[38;5;196muvw…\u001B[39m',
	],
	[
		'colon truecolor',
		'\u001B[38:2::255:0:0mabcdef\nuvwxyz\u001B[39m',
		'\u001B[38;2;255;0;0mabc…\u001B[39m\n\u001B[38;2;255;0;0muvw…\u001B[39m',
	],
] as const) {
	test(`truncated multi-line text keeps a ${name} that spans a newline`, t => {
		const output = renderToString(
			<Box width={4}>
				<Text wrap="truncate">{text}</Text>
			</Box>,
		);

		t.is(output, expected);
	});
}

test('uses separate cache entries for different widths', t => {
	t.is(wrapText('hello world', 5, 'truncate-end'), 'hell…');
	t.is(wrapText('hello world', 8, 'truncate-end'), 'hello w…');
});

test('evicts old cached results', t => {
	const cacheKey = '5\u0000truncate-end\u0000cache-test-first';
	wrapTextCache.clear();
	wrapText('cache-test-first', 5, 'truncate-end');

	for (let index = 0; index < 8192; index++) {
		wrapText(`cache-test-${index}`, 5, 'truncate-end');
	}

	t.false(wrapTextCache.has(cacheKey));
});

test('uses separate cache entries for texts that end with digits', t => {
	wrapTextCache.clear();

	t.is(wrapText('ab', 12, 'wrap'), 'ab');
	t.is(wrapText('ab1', 2, 'wrap'), 'ab\n1');
});

test('does not reuse a cached result from a wider box', t => {
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

	t.is(output, '一二\n三四\n五六\n七八\n九十1');
});
