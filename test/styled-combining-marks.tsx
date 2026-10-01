import test, {before, after, type TestContext} from 'node:test';
import React from 'react';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import {Box, Text, renderToString} from '../src/index.js';

const originalColorLevel = chalk.level;
before(() => {
	chalk.level = 3;
});
after(() => {
	chalk.level = originalColorLevel;
});

for (const accent of ['́', '̈']) {
	test(`combining mark ${accent} survives a nested Text style boundary`, (t: TestContext) => {
		const output = renderToString(
			<Box>
				<Text>
					e<Text color="red">{accent}</Text>
				</Text>
				<Text>X</Text>
			</Box>,
		);

		t.assert.strictEqual(stripAnsi(output), `e${accent}X`);
	});
}

test('following text retains its color after a styled combining mark', (t: TestContext) => {
	const output = renderToString(
		<Text>
			e<Text color="red">́X</Text>Y
		</Text>,
	);
	t.assert.strictEqual(output, `é${chalk.red('X')}Y`);
});

test('a combining mark retains the style of its base character', (t: TestContext) => {
	const output = renderToString(
		<Text>
			<Text color="blue">e</Text>
			<Text color="red">́X</Text>
		</Text>,
	);
	const expected = renderToString(
		<Text>
			<Text color="blue">é</Text>
			<Text color="red">X</Text>
		</Text>,
	);
	t.assert.strictEqual(output, expected);
});

test('multiple styled marks attach to one base cell', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Text>
				a<Text bold>́</Text>
				<Text color="red">̈</Text>
			</Text>
			<Text>X</Text>
		</Box>,
	);
	t.assert.strictEqual(stripAnsi(output), 'á̈X');
});

test('newlines remain between a base and a following combining mark', (t: TestContext) => {
	const output = renderToString(
		<Text>
			e{'\n'}
			<Text color="red">́X</Text>
		</Text>,
	);
	t.assert.ok(stripAnsi(output).startsWith('e\n'));
});

test('wrapping keeps a styled accent on the preceding base character', (t: TestContext) => {
	const output = renderToString(
		<Box width={1}>
			<Text>
				e<Text color="red">́X</Text>
			</Text>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output).normalize(), 'é\nX');
});

test('a styled variation selector keeps emoji presentation and width', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Text>
				❤<Text color="red">️</Text>
			</Text>
			<Text>X</Text>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output), '❤️X');
});

test('a styled mark without a base character keeps its position and style', (t: TestContext) => {
	const output = renderToString(
		<Text>
			<Text color="red">{'\u{301}X'}</Text>Y
		</Text>,
	);

	t.assert.strictEqual(output, `\u{301}${chalk.red('X')}Y`);
});
