import React from 'react';
import test from 'ava';
import stripAnsi from 'strip-ansi';
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
