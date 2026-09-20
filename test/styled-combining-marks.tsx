import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import {Box, Text, renderToString} from '../src/index.js';

const originalColorLevel = chalk.level;
test.before(() => {
	chalk.level = 3;
});
test.after(() => {
	chalk.level = originalColorLevel;
});

for (const accent of ['́', '̈']) {
	test(`combining mark ${accent} survives a nested Text style boundary`, t => {
		const output = renderToString(
			<Box>
				<Text>
					e<Text color="red">{accent}</Text>
				</Text>
				<Text>X</Text>
			</Box>,
		);

		t.is(stripAnsi(output), `e${accent}X`);
	});
}

test('following text retains its color after a styled combining mark', t => {
	const output = renderToString(
		<Text>
			e<Text color="red">́X</Text>Y
		</Text>,
	);
	t.is(output, `é${chalk.red('X')}Y`);
});

test('a combining mark retains the style of its base character', t => {
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
	t.is(output, expected);
});

test('multiple styled marks attach to one base cell', t => {
	const output = renderToString(
		<Box>
			<Text>
				a<Text bold>́</Text>
				<Text color="red">̈</Text>
			</Text>
			<Text>X</Text>
		</Box>,
	);
	t.is(stripAnsi(output), 'á̈X');
});

test('newlines remain between a base and a following combining mark', t => {
	const output = renderToString(
		<Text>
			e{'\n'}
			<Text color="red">́X</Text>
		</Text>,
	);
	t.true(stripAnsi(output).startsWith('e\n'));
});

test('wrapping keeps a styled accent on the preceding base character', t => {
	const output = renderToString(
		<Box width={1}>
			<Text>
				e<Text color="red">́X</Text>
			</Text>
		</Box>,
	);

	t.is(stripAnsi(output).normalize(), 'é\nX');
});

test('a styled variation selector keeps emoji presentation and width', t => {
	const output = renderToString(
		<Box>
			<Text>
				❤<Text color="red">️</Text>
			</Text>
			<Text>X</Text>
		</Box>,
	);

	t.is(stripAnsi(output), '❤️X');
});

test('a styled mark without a base character keeps its position and style', t => {
	const output = renderToString(
		<Text>
			<Text color="red">{'\u0301X'}</Text>Y
		</Text>,
	);

	t.is(output, `\u0301${chalk.red('X')}Y`);
});
