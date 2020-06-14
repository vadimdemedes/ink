import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import {renderToString} from './helpers/render-to-string';
import {Text} from '../src';

test('text with standard color', t => {
	const output = renderToString(<Text color="green">Test</Text>);
	t.is(output, chalk.green('Test'));
});

test('text with dimmed color', t => {
	const output = renderToString(
		<Text dimColor color="green">
			Test
		</Text>
	);

	t.is(output, chalk.green.dim('Test'));
});

test('text with hex color', t => {
	const output = renderToString(<Text color="#FF8800">Test</Text>);
	t.is(output, chalk.hex('#FF8800')('Test'));
});

test('text with rgb color', t => {
	const output = renderToString(<Text color="rgb(255, 136, 0)">Test</Text>);
	t.is(output, chalk.rgb(255, 136, 0)('Test'));
});

test('text with hsl color', t => {
	const output = renderToString(<Text color="hsl(32, 100, 50)">Test</Text>);
	t.is(output, chalk.hsl(32, 100, 50)('Test'));
});

test('text with hsv color', t => {
	const output = renderToString(<Text color="hsv(32, 100, 100)">Test</Text>);
	t.is(output, chalk.hsv(32, 100, 100)('Test'));
});

test('text with hwb color', t => {
	const output = renderToString(<Text color="hwb(32, 0, 50)">Test</Text>);
	t.is(output, chalk.hwb(32, 0, 50)('Test'));
});

test('text with ansi color', t => {
	const output = renderToString(<Text color="ansi(31)">Test</Text>);
	t.is(output, chalk.ansi(31)('Test'));
});

test('text with ansi256 color', t => {
	const output = renderToString(<Text color="ansi256(194)">Test</Text>);
	t.is(output, chalk.ansi256(194)('Test'));
});

test('text with standard background color', t => {
	const output = renderToString(<Text backgroundColor="green">Test</Text>);
	t.is(output, chalk.bgGreen('Test'));
});

test('text with hex background color', t => {
	const output = renderToString(<Text backgroundColor="#FF8800">Test</Text>);
	t.is(output, chalk.bgHex('#FF8800')('Test'));
});

test('text with rgb background color', t => {
	const output = renderToString(
		<Text backgroundColor="rgb(255, 136, 0)">Test</Text>
	);

	t.is(output, chalk.bgRgb(255, 136, 0)('Test'));
});

test('text with hsl background color', t => {
	const output = renderToString(
		<Text backgroundColor="hsl(32, 100, 50)">Test</Text>
	);

	t.is(output, chalk.bgHsl(32, 100, 50)('Test'));
});

test('text with hsv background color', t => {
	const output = renderToString(
		<Text backgroundColor="hsv(32, 100, 100)">Test</Text>
	);

	t.is(output, chalk.bgHsv(32, 100, 100)('Test'));
});

test('text with hwb background color', t => {
	const output = renderToString(
		<Text backgroundColor="hwb(32, 0, 50)">Test</Text>
	);

	t.is(output, chalk.bgHwb(32, 0, 50)('Test'));
});

test('text with ansi background color', t => {
	const output = renderToString(<Text backgroundColor="ansi(31)">Test</Text>);
	t.is(output, chalk.bgAnsi(31)('Test'));
});

test('text with ansi256 background color', t => {
	const output = renderToString(
		<Text backgroundColor="ansi256(194)">Test</Text>
	);

	t.is(output, chalk.bgAnsi256(194)('Test'));
});
