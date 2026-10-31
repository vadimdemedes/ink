import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, Transform, renderToString} from '../src/index.js';

test('root transform output is sanitized like nested transform output', (t: TestContext) => {
	const transform = () => '\u{1B}[2Jx';
	const root = renderToString(<Transform transform={transform}>a</Transform>);
	const nested = renderToString(
		<Text>
			<Transform transform={transform}>a</Transform>
		</Text>,
	);
	t.assert.strictEqual(root, nested);
	t.assert.strictEqual(root, 'x');
});

test('hyperlink transform with hostile url cannot end the OSC early', (t: TestContext) => {
	const url = 'https://example.com/\u{7}\u{1B}[2J';
	const link = (text: string) => `\u{1B}]8;;${url}\u{7}${text}\u{1B}]8;;\u{7}`;
	const output = renderToString(
		<Box>
			<Transform transform={link}>link</Transform>
		</Box>,
	);
	// The terminal ends the OSC at BEL, so the url is cut there and the CSI and stray BEL after it are dropped.
	t.assert.strictEqual(
		output,
		'\u{1B}]8;;https://example.com/\u{7}link\u{1B}]8;;\u{7}',
	);
});

test('root transform keeps SGR and well-formed hyperlinks', (t: TestContext) => {
	const styled = '\u{1B}[38;2;255;0;0mred\u{1B}[39m';
	const link = '\u{1B}]8;;https://example.com\u{7}link\u{1B}]8;;\u{7}';
	t.assert.strictEqual(
		renderToString(<Transform transform={() => styled}>a</Transform>),
		styled,
	);
	t.assert.strictEqual(
		renderToString(<Transform transform={() => link}>a</Transform>),
		link,
	);
});
