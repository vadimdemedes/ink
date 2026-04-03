import React from 'react';
import test from 'ava';
import stripAnsi from 'strip-ansi';
import stringWidth from 'string-width';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('wide characters do not add extra space inside fixed-width Box', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box>
				<Box width={2}>
					<Text>🍔</Text>
				</Box>
				<Text>|</Text>
			</Box>
			<Box>
				<Box width={2}>
					<Text>⏳</Text>
				</Box>
				<Text>|</Text>
			</Box>
		</Box>,
	);

	const lines = output.split('\n');
	t.is(lines.length, 2);
	t.is(lines[0], '🍔|');
	t.is(lines[1], '⏳|');
});

test('CJK characters occupy correct width in fixed-width Box', t => {
	const output = renderToString(
		<Box>
			<Box width={4}>
				<Text>你好</Text>
			</Box>
			<Text>|</Text>
		</Box>,
	);

	t.is(output, '你好|');
});

test('mixed ASCII and wide characters align correctly', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box>
				<Box width={6}>
					<Text>ab🍔cd</Text>
				</Box>
				<Text>|</Text>
			</Box>
			<Box>
				<Box width={6}>
					<Text>abcdef</Text>
				</Box>
				<Text>|</Text>
			</Box>
		</Box>,
	);

	const lines = output.split('\n');
	t.is(lines.length, 2);
	t.is(lines[0], 'ab🍔cd|');
	t.is(lines[1], 'abcdef|');
});

test('ANSI styled text does not affect layout width', t => {
	const output = renderToString(
		<Box>
			<Box width={5}>
				<Text color="red">hello</Text>
			</Box>
			<Text>|</Text>
		</Box>,
	);

	const stripped = stripAnsi(output);
	t.is(stripped, 'hello|');
});

test('empty Text does not affect sibling layout', t => {
	const output = renderToString(
		<Box>
			<Text />
			<Text>hello</Text>
		</Box>,
	);

	t.is(output, 'hello');
});

test('CJK text truncated at correct display width', t => {
	const output = renderToString(
		<Box flexDirection="column" width={20}>
			<Text wrap="truncate">ABCDEFGHIJKLMNOPQRST|end</Text>
			<Text wrap="truncate">あいうえおかきくけこ|end</Text>
		</Box>,
	);

	const lines = output.split('\n');
	t.is(lines.length, 2);
	t.is(stripAnsi(lines[0]!), 'ABCDEFGHIJKLMNOPQRS…');
	// CJK: 9 wide chars (18 cols) + … (1 col) = 19, since a 2-col char cannot
	// fit in the remaining 1 column at position 19
	t.is(stripAnsi(lines[1]!), 'あいうえおかきくけ…');
});

test('CJK text truncated in the middle at correct display width', t => {
	const output = renderToString(
		<Box width={20}>
			<Text wrap="truncate-middle">あいうえおかきくけこさしすせそ</Text>
		</Box>,
	);

	t.true(stringWidth(stripAnsi(output)) <= 20);
	t.true(stripAnsi(output).includes('…'));
});

test('CJK text truncated at start at correct display width', t => {
	const output = renderToString(
		<Box width={20}>
			<Text wrap="truncate-start">あいうえおかきくけこさしすせそ</Text>
		</Box>,
	);

	t.true(stringWidth(stripAnsi(output)) <= 20);
	t.true(stripAnsi(output).includes('…'));
});

test('CJK content does not overflow fixed-width Box', t => {
	const output = renderToString(
		<Box>
			<Box flexDirection="column" width={20}>
				<Text>12345678901234567890</Text>
				<Text>あいうえおかきくけこ</Text>
			</Box>
			<Text>|</Text>
		</Box>,
	);

	const lines = output.split('\n');
	// Pipe should appear at column 20 on the first line
	t.is(lines[0], '12345678901234567890|');
	// CJK text should fit within 20 display columns
	t.is(lines[1], 'あいうえおかきくけこ');
});
