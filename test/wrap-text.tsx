import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import wrapText, {wrapTextCache} from '../src/wrap-text.js';
import {renderToString} from './helpers/render-to-string.js';

test('wraps text', t => {
	t.is(wrapText('hello world', 5, 'wrap'), 'hello\n \nworld');
});

test('truncates text at the end', t => {
	t.is(wrapText('hello world', 5, 'truncate-end'), 'hell…');
});

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
