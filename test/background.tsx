import test, {before, after, type TestContext} from 'node:test';
import React, {useState} from 'react';
import chalk from 'chalk';
import {render, Box, Text, Static} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';
import {renderAsync} from './helpers/test-renderer.js';
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
	bgRed: '\u{1B}[41m',
	bgGreen: '\u{1B}[42m',
	bgYellow: '\u{1B}[43m',
	bgBlue: '\u{1B}[44m',
	bgMagenta: '\u{1B}[45m',
	bgCyan: '\u{1B}[46m',

	// Hex/RGB colors (24-bit)
	bgHexRed: '\u{1B}[48;2;255;0;0m', // #FF0000 or rgb(255,0,0)

	// ANSI256 colors
	bgAnsi256Nine: '\u{1B}[48;5;9m', // Ansi256(9)

	// Reset
	bgReset: '\u{1B}[49m',
} as const;

// Enable colors for all tests
before(() => {
	enableTestColors();
});

after(() => {
	disableTestColors();
});

for (const initialBackgroundColor of [undefined, 'red']) {
	test(`Box preserves child state when ${initialBackgroundColor === undefined ? 'adding' : 'removing'} a background color`, async (t: TestContext) => {
		function StatefulChild({initialValue}: {readonly initialValue: string}) {
			// A remount must be observable through the initial state.
			const [value] = useState(initialValue);
			return <Text>{value}</Text>;
		}

		const {getOutput, rerenderAsync, unmount} = await renderAsync(
			<Box backgroundColor={initialBackgroundColor}>
				<StatefulChild initialValue="original" />
			</Box>,
		);
		t.after(() => {
			unmount();
		});
		t.assert.ok(getOutput().includes('original'));

		await rerenderAsync(
			<Box
				backgroundColor={
					initialBackgroundColor === undefined ? 'red' : undefined
				}
			>
				<StatefulChild initialValue="reset" />
			</Box>,
		);

		t.assert.ok(getOutput().includes('original'));
		t.assert.strictEqual(getOutput().includes('reset'), false);
	});
}

test('Static background color is inherited by its text', (t: TestContext) => {
	const output = renderToString(
		<Static items={['A']} style={{width: 3, backgroundColor: 'blue'}}>
			{item => <Text key={item}>{item}</Text>}
		</Static>,
	);

	t.assert.strictEqual(output, `${ansi.bgBlue}A  ${ansi.bgReset}\n`);
});

// Text inheritance tests (these work in non-TTY)
test('Text inherits parent Box background color', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="green" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgGreen('Hello World'));
});

test('Text explicit background color overrides inherited', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Text backgroundColor="blue">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgBlue('Hello World'));
});

test('Nested Box background inheritance', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Box backgroundColor="blue">
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgBlue('Hello World'));
});

test('Nested Text inherits the nearest Text background instead of the Box background', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Text backgroundColor="blue">
				Hello <Text>World</Text>
			</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgBlue('Hello World'));
});

test('Text without parent Box background has no inheritance', (t: TestContext) => {
	const output = renderToString(
		<Box alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('Multiple Text elements inherit same background', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="yellow" alignSelf="flex-start">
			<Text>Hello </Text>
			<Text>World</Text>
		</Box>,
	);

	// Text nodes are rendered as a single block with shared background
	t.assert.strictEqual(output, chalk.bgYellow('Hello World'));
});

test('Mixed text with and without background inheritance', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="green" alignSelf="flex-start">
			<Text>Inherited </Text>
			<Text backgroundColor="">No BG </Text>
			<Text backgroundColor="red">Red BG</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		chalk.bgGreen('Inherited ') + 'No BG ' + chalk.bgRed('Red BG'),
	);
});

test('Complex nested structure with background inheritance', (t: TestContext) => {
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
	t.assert.strictEqual(
		output,
		`${ansi.bgYellow}Outer: ${ansi.bgBlue}Inner: ${ansi.bgRed}Explicit${ansi.bgReset}`,
	);
});

// Background color tests for different formats
test('Box background with standard color', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgRed('Hello'));
});

test('Box background with hex color', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="#FF0000" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgHex('#FF0000')('Hello'));
});

test('Box background with rgb color', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="rgb(255, 0, 0)" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgRgb(255, 0, 0)('Hello'));
});

test('Box background with ansi256 color', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="ansi256(9)" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgAnsi256(9)('Hello'));
});

test('Box background with wide characters', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="yellow" alignSelf="flex-start">
			<Text>こんにちは</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgYellow('こんにちは'));
});

test('Box background with emojis', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Text>🎉🎊</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgRed('🎉🎊'));
});

// Box background space fill tests - these should work with forced colors
test('Box background fills entire area with standard color', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="red" width={10} height={3} alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	// Should contain background color codes and fill spaces for entire Box area
	t.assert.ok(
		output.includes(ansi.bgRed),
		'Should contain red background start code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
	t.assert.ok(output.includes('Hello'), 'Should contain the text');
	t.assert.ok(
		output.includes(`${ansi.bgRed}          ${ansi.bgReset}`),
		'Should contain background fill line',
	);
});

test('Box background fills with hex color', (t: TestContext) => {
	const output = renderToString(
		<Box backgroundColor="#FF0000" width={10} height={3} alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	// Should contain hex color background codes and fill spaces
	t.assert.ok(output.includes('Hello'), 'Should contain the text');
	t.assert.ok(
		output.includes(ansi.bgHexRed),
		'Should contain hex RGB background code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
});

test('Box background fills with rgb color', (t: TestContext) => {
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
	t.assert.ok(output.includes('Hello'), 'Should contain the text');
	t.assert.ok(
		output.includes(ansi.bgHexRed),
		'Should contain RGB background code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
});

test('Box background fills with ansi256 color', (t: TestContext) => {
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
	t.assert.ok(output.includes('Hello'), 'Should contain the text');
	t.assert.ok(
		output.includes(ansi.bgAnsi256Nine),
		'Should contain ANSI256 background code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
});

test('Box background with border fills content area', (t: TestContext) => {
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
	t.assert.ok(output.includes('Hi'), 'Should contain the text');
	t.assert.ok(
		output.includes(ansi.bgCyan),
		'Should contain cyan background code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
	t.assert.ok(output.includes('╭'), 'Should contain top-left border');
	t.assert.ok(output.includes('╮'), 'Should contain top-right border');
});

test('Box background with padding fills entire padded area', (t: TestContext) => {
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
	t.assert.ok(output.includes('Hi'), 'Should contain the text');
	t.assert.ok(
		output.includes(ansi.bgMagenta),
		'Should contain magenta background code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
});

test('Box background with center alignment fills entire area', (t: TestContext) => {
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

	t.assert.ok(output.includes('Hi'), 'Should contain centered text');
	t.assert.ok(
		output.includes(ansi.bgBlue),
		'Should contain blue background code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
});

test('Box background with column layout fills entire area', (t: TestContext) => {
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

	t.assert.ok(output.includes('Line 1'), 'Should contain first line text');
	t.assert.ok(output.includes('Line 2'), 'Should contain second line text');
	t.assert.ok(
		output.includes(ansi.bgGreen),
		'Should contain green background code',
	);
	t.assert.ok(
		output.includes(ansi.bgReset),
		'Should contain background reset code',
	);
});

// Update tests using render() for comprehensive coverage
test('Box background updates on rerender', (t: TestContext) => {
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

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Hello');

	rerender(<Test bgColor="green" />);
	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		chalk.bgGreen('Hello'),
	);

	rerender(<Test />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Hello');
});

// Concurrent mode tests
test('Text inherits parent Box background color - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box backgroundColor="green" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgGreen('Hello World'));
});

test('Nested Box background inheritance - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box backgroundColor="red" alignSelf="flex-start">
			<Box backgroundColor="blue">
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgBlue('Hello World'));
});

test('Box background with hex color - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box backgroundColor="#FF0000" alignSelf="flex-start">
			<Text>Hello</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.bgHex('#FF0000')('Hello'));
});

test('Box background updates on rerender - concurrent', async (t: TestContext) => {
	function Test({bgColor}: {readonly bgColor?: string}) {
		return (
			<Box backgroundColor={bgColor} alignSelf="flex-start">
				<Text>Hello</Text>
			</Box>
		);
	}

	const {getOutput, rerenderAsync} = await renderAsync(<Test />);

	t.assert.strictEqual(getOutput(), 'Hello');

	await rerenderAsync(<Test bgColor="green" />);
	t.assert.strictEqual(getOutput(), chalk.bgGreen('Hello'));

	await rerenderAsync(<Test />);
	t.assert.strictEqual(getOutput(), 'Hello');
});

test('Box backgroundColor fills full width on every line when text wraps', (t: TestContext) => {
	// "Hello World!!" is 13 chars, width=10 forces wrapping into 2 lines
	const output = renderToString(
		<Box backgroundColor="red" width={10} alignSelf="flex-start">
			<Text>Hello World!!</Text>
		</Box>,
	);

	// Both lines are padded to the full 10-char Box width with background color
	t.assert.strictEqual(
		output,
		`${ansi.bgRed}Hello     ${ansi.bgReset}\n${ansi.bgRed}World!!   ${ansi.bgReset}`,
	);
});

test('Text-only backgroundColor colors text content but does not fill Box width', (t: TestContext) => {
	// Without a Box backgroundColor, only the text characters are colored
	const output = renderToString(
		<Box width={10} alignSelf="flex-start">
			<Text backgroundColor="red">Hello World!!</Text>
		</Box>,
	);

	// Text-only bg colors just the text, not the remaining space to fill Box width
	t.assert.strictEqual(
		output,
		`${ansi.bgRed}Hello ${ansi.bgReset}\n${ansi.bgRed}World!!${ansi.bgReset}`,
	);
});
