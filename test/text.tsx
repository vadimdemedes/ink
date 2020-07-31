import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import {renderToString} from './helpers/render-to-string';
import {render, Box, Text} from '../src';
import createStdout from './helpers/create-stdout';

test('<Text> with undefined children', t => {
	const output = renderToString(<Text />);
	t.is(output, '');
});

test('<Text> with null children', t => {
	const output = renderToString(<Text>{null}</Text>);
	t.is(output, '');
});

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

test('text with inversion', t => {
	const output = renderToString(<Text inverse>Test</Text>);
	t.is(output, chalk.inverse('Test'));
});

test('remeasure text when text is changed', t => {
	const Test = ({add}) => (
		<Box>
			<Text>{add ? 'abcx' : 'abc'}</Text>
		</Box>
	);

	const stdout = createStdout();
	const {rerender} = render(<Test />, {stdout, debug: true});
	t.is(stdout.write.lastCall.args[0], 'abc');

	rerender(<Test add />);
	t.is(stdout.write.lastCall.args[0], 'abcx');
});

test('remeasure text when text nodes are changed', t => {
	const Test = ({add}) => (
		<Box>
			<Text>
				abc
				{add && <Text>x</Text>}
			</Text>
		</Box>
	);

	const stdout = createStdout();
	const {rerender} = render(<Test />, {stdout, debug: true});
	t.is(stdout.write.lastCall.args[0], 'abc');

	rerender(<Test add />);
	t.is(stdout.write.lastCall.args[0], 'abcx');
});
