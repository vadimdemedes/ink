import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import {render, Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';
import {enableTestColors, disableTestColors} from './helpers/force-colors.js';

// ANSI escape sequences for background colors
// Note: We test against raw ANSI codes rather than chalk predicates because:
// 1. Different color reset patterns:
//    - Chalk: '\u001b[43mHello \u001b[49m\u001b[43mWorld\u001b[49m' (individual resets)
//    - Ink:   '\u001b[43mHello World\u001b[49m' (continuous blocks)
// 2. Background space fills that chalk doesn't generate:
//    - Ink: '\u001b[41mHello     \u001b[49m\n\u001b[41m          \u001b[49m' (fills entire Box area)
// 3. Context-aware color transitions:
//    - Chalk: '\u001b[43mOuter: \u001b[49m\u001b[44mInner: \u001b[49m\u001b[41mExplicit\u001b[49m'
//    - Ink:   '\u001b[43mOuter: \u001b[44mInner: \u001b[41mExplicit\u001b[49m' (no intermediate resets)
const ansi = {
	// Standard colors
	bgRed: '\u001B[41m',
	bgGreen: '\u001B[42m',
	bgYellow: '\u001B[43m',
	bgBlue: '\u001B[44m',
	bgMagenta: '\u001B[45m',
	bgCyan: '\u001B[46m',

	// Hex/RGB colors (24-bit)
	bgHexRed: '\u001B[48;2;255;0;0m', // #FF0000 or rgb(255,0,0)

	// ANSI256 colors
	bgAnsi256Nine: '\u001B[48;5;9m', // Ansi256(9)

	// Reset
	bgReset: '\u001B[49m',
} as const;

// Enable colors for all tests
test.before(() => {
	enableTestColors();
});

test.after(() => {
	disableTestColors();
});

// Text inheritance tests (these work in non-TTY)
test('Text inherits parent Box background color', t => {
	const output = renderToString(
		<Box backgroundColor="green" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, chalk.bgGreen('Hello World'));
});

test('Text explicit background color overrides inherited', t => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Text backgroundColor="blue">Hello World</Text>
		</Box>,
	);

	t.is(output, chalk.bgBlue('Hello World'));
});

test('Nested Box background inheritance', t => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Box backgroundColor="blue">
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, chalk.bgBlue('Hello World'));
});

test('Text without parent Box background has no inheritance', t => {
	const output = renderToString(
		<Box alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, 'Hello World');
});

test('Multiple Text elements inherit same background', t => {
	const output = renderToString(
		<Box backgroundColor="yellow" alignSelf="flex-start">
			<Text>Hello </Text>
			<Text>World</Text>
		</Box>,
	);

	// Text nodes are rendered as a single block with shared background
	t.is(output, chalk.bgYellow('Hello World'));
});

test('Mixed text with and without background inheritance', t => {
	const output = renderToString(
		<Box backgroundColor="green" alignSelf="flex-start">
			<Text>Inherited </Text>
			<Text backgroundColor="">No BG </Text>
			<Text backgroundColor="red">Red BG</Text>
		</Box>,
	);

	t.is(output, chalk.bgGreen('Inherited ') + 'No BG ' + chalk.bgRed('Red BG'));
});

test('Complex nested structure with background inheritance', t => {
	const output = renderToString(
		<Box backgroundColor="yellow" alignSelf="flex-start">
			<Box>
				<Text>Outer: </Text>
				<Box backgroundColor="blue">
					<Text>Inner: </Text>
					<Text backgroundColor="red">Explicit</Text>
				</Box>
			</Box>
		</Box>,
	);

	// Colors transition without reset codes between them - actual behavior from debug output
	t.is(
		output,
		`${ansi.bgYellow}Outer: ${ansi.bgBlue}Inner: ${ansi.bgRed}Explicit${ansi.bgReset}`,
	);
});

// Background color tests for different formats
test('Box background with standard color', t => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.is(output, chalk.bgRed('Hello'));
});

test('Box background with hex color', t => {
	const output = renderToString(
		<Box backgroundColor="#FF0000" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.is(output, chalk.bgHex('#FF0000')('Hello'));
});

test('Box background with rgb color', t => {
	const output = renderToString(
		<Box backgroundColor="rgb(255, 0, 0)" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.is(output, chalk.bgRgb(255, 0, 0)('Hello'));
});

test('Box background with ansi256 color', t => {
	const output = renderToString(
		<Box backgroundColor="ansi256(9)" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.is(output, chalk.bgAnsi256(9)('Hello'));
});

test('Box background with wide characters', t => {
	const output = renderToString(
		<Box backgroundColor="yellow" alignSelf="flex-start">
			<Text>こんにちは</Text>
		</Box>,
	);

	t.is(output, chalk.bgYellow('こんにちは'));
});

test('Box background with emojis', t => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Text>🎉🎊</Text>
		</Box>,
	);

	t.is(output, chalk.bgRed('🎉🎊'));
});

// Box background space fill tests - these should work with forced colors
test('Box background fills entire area with standard color', t => {
	const output = renderToString(
		<Box backgroundColor="red" width={10} height={3} alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	// Should contain background color codes and fill spaces for entire Box area
	t.true(
		output.includes(ansi.bgRed),
		'Should contain red background start code',
	);
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
	t.true(output.includes('Hello'), 'Should contain the text');
	t.true(
		output.includes(`${ansi.bgRed}          ${ansi.bgReset}`),
		'Should contain background fill line',
	);
});

test('Box background fills with hex color', t => {
	const output = renderToString(
		<Box backgroundColor="#FF0000" width={10} height={3} alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	// Should contain hex color background codes and fill spaces
	t.true(output.includes('Hello'), 'Should contain the text');
	t.true(
		output.includes(ansi.bgHexRed),
		'Should contain hex RGB background code',
	);
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
});

test('Box background fills with rgb color', t => {
	const output = renderToString(
		<Box
			backgroundColor="rgb(255, 0, 0)"
			width={10}
			height={3}
			alignSelf="flex-start"
		>
			<Text>Hello</Text>
		</Box>,
	);

	// Should contain RGB color background codes and fill spaces
	t.true(output.includes('Hello'), 'Should contain the text');
	t.true(output.includes(ansi.bgHexRed), 'Should contain RGB background code');
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
});

test('Box background fills with ansi256 color', t => {
	const output = renderToString(
		<Box
			backgroundColor="ansi256(9)"
			width={10}
			height={3}
			alignSelf="flex-start"
		>
			<Text>Hello</Text>
		</Box>,
	);

	// Should contain ANSI256 color background codes and fill spaces
	t.true(output.includes('Hello'), 'Should contain the text');
	t.true(
		output.includes(ansi.bgAnsi256Nine),
		'Should contain ANSI256 background code',
	);
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
});

test('Box background with border fills content area', t => {
	const output = renderToString(
		<Box
			backgroundColor="cyan"
			borderStyle="round"
			width={10}
			height={5}
			alignSelf="flex-start"
		>
			<Text>Hi</Text>
		</Box>,
	);

	// Should have background fill inside the border and border characters
	t.true(output.includes('Hi'), 'Should contain the text');
	t.true(output.includes(ansi.bgCyan), 'Should contain cyan background code');
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
	t.true(output.includes('╭'), 'Should contain top-left border');
	t.true(output.includes('╮'), 'Should contain top-right border');
});

test('Box background with padding fills entire padded area', t => {
	const output = renderToString(
		<Box
			backgroundColor="magenta"
			padding={1}
			width={10}
			height={5}
			alignSelf="flex-start"
		>
			<Text>Hi</Text>
		</Box>,
	);

	// Background should fill the entire Box area including padding
	t.true(output.includes('Hi'), 'Should contain the text');
	t.true(
		output.includes(ansi.bgMagenta),
		'Should contain magenta background code',
	);
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
});

test('Box background with center alignment fills entire area', t => {
	const output = renderToString(
		<Box
			backgroundColor="blue"
			width={10}
			height={3}
			justifyContent="center"
			alignSelf="flex-start"
		>
			<Text>Hi</Text>
		</Box>,
	);

	t.true(output.includes('Hi'), 'Should contain centered text');
	t.true(output.includes(ansi.bgBlue), 'Should contain blue background code');
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
});

test('Box background with column layout fills entire area', t => {
	const output = renderToString(
		<Box
			backgroundColor="green"
			flexDirection="column"
			width={10}
			height={5}
			alignSelf="flex-start"
		>
			<Text>Line 1</Text>
			<Text>Line 2</Text>
		</Box>,
	);

	t.true(output.includes('Line 1'), 'Should contain first line text');
	t.true(output.includes('Line 2'), 'Should contain second line text');
	t.true(output.includes(ansi.bgGreen), 'Should contain green background code');
	t.true(output.includes(ansi.bgReset), 'Should contain background reset code');
});

// Update tests using render() for comprehensive coverage
test('Box background updates on rerender', t => {
	const stdout = createStdout();

	function Test({bgColor}: {readonly bgColor?: string}) {
		return (
			<Box backgroundColor={bgColor} alignSelf="flex-start">
				<Text>Hello</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test />, {
		stdout,
		debug: true,
	});

	t.is((stdout.write as any).lastCall.args[0], 'Hello');

	rerender(<Test bgColor="green" />);
	t.is((stdout.write as any).lastCall.args[0], chalk.bgGreen('Hello'));

	rerender(<Test />);
	t.is((stdout.write as any).lastCall.args[0], 'Hello');
});
