import test, {after, before, type TestContext} from 'node:test';
import React from 'react';
import chalk from 'chalk';
import Output from '../src/output.js';
import {Box, Text, renderToString} from '../src/index.js';

const originalColorLevel = chalk.level;
before(() => {
	chalk.level = 3;
});
after(() => {
	chalk.level = originalColorLevel;
});

test('styles spanning newlines render the same across frames', (t: TestContext) => {
	const text = chalk.red('span 1\nspan 2');
	const expected = `${chalk.red('span 1')}\n${chalk.red('span 2')}`;

	const first = renderToString(<Text>{text}</Text>);
	const second = renderToString(<Text>{text}</Text>);
	t.assert.strictEqual(first, expected);
	t.assert.strictEqual(second, expected);
});

test('clipped multiline text with links and emoji renders the same across frames', (t: TestContext) => {
	const content = [
		chalk.blue('🚀 Header with rocket emoji'),
		'\u{1B}]8;;https://example.com\u{7}🔗 Link row in dashboard\u{1B}]8;;\u{7}',
		chalk.green('✔ Status: operational'),
	].join('\n');

	const renderFrame = () =>
		renderToString(
			<Box width={10} height={3} overflow="hidden">
				<Text wrap="truncate-end">{content}</Text>
			</Box>,
		);

	const expected = [
		chalk.blue('🚀 Header…'),
		'\u{1B}]8;;https://example.com\u{7}🔗 Link r\u{1B}]8;;\u{7}…',
		chalk.green('✔ Status:…'),
	].join('\n');

	const first = renderFrame();
	const second = renderFrame();
	t.assert.strictEqual(first, expected);
	t.assert.strictEqual(second, expected);
});

test('a 120x40 dashboard with one changing row renders every frame', (t: TestContext) => {
	const stableRows = Array.from(
		{length: 39},
		(_, index) =>
			`Row ${index.toString().padStart(2, '0')}: stable content across frames`,
	);

	for (let frame = 0; frame < 5; frame++) {
		const screen = [...stableRows, `Row 39: dynamic status ${frame}`].join(
			'\n',
		);

		t.assert.strictEqual(
			renderToString(
				<Box width={120} height={40}>
					<Text>{screen}</Text>
				</Box>,
			),
			screen,
		);
	}
});

test('horizontal clipping keeps fitting lines and slices overflowing ones', (t: TestContext) => {
	const output = new Output({width: 20, height: 2});
	output.clip({x1: 2, x2: 15, y1: 0, y2: 2});
	output.write(2, 0, 'hello', {transformers: []});
	output.write(0, 1, '0123456789abcdefgh', {transformers: []});
	output.unclip();

	t.assert.strictEqual(output.get().output, '  hello\n  23456789abcde');
});
