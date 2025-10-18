import test from 'ava';
import stripAnsi from 'strip-ansi';
import chalk from 'chalk';
import {composeTextFragments, type TextFragment} from '../src/index.js';

test('composeTextFragments - basic string composition', t => {
	const fragments: TextFragment[] = ['Hello ', 'World', '!'];
	const result = composeTextFragments(fragments);
	t.is(result, 'Hello World!');
});

test('composeTextFragments - empty array', t => {
	const result = composeTextFragments([]);
	t.is(result, '');
});

test('composeTextFragments - single string', t => {
	const result = composeTextFragments(['Hello World']);
	t.is(result, 'Hello World');
});

test('composeTextFragments - object fragment with text only', t => {
	const fragments: TextFragment[] = ['Hello ', {text: 'World'}, '!'];
	const result = composeTextFragments(fragments);
	t.is(result, 'Hello World!');
});

test('composeTextFragments - single style', t => {
	const fragments: TextFragment[] = [
		'Hello ',
		{
			text: 'World',
			styles: [{bold: true}],
		},
		'!',
	];
	const result = composeTextFragments(fragments);
	const expected = `Hello ${chalk.bold('World')}!`;
	t.is(result, expected);
});

test('composeTextFragments - multiple styles', t => {
	const fragments: TextFragment[] = [
		{
			text: 'Hello',
			styles: [
				{
					bold: true,
					color: 'green',
					underline: true,
				},
			],
		},
	];
	const result = composeTextFragments(fragments);
	const expected = chalk.underline(chalk.bold(chalk.green('Hello')));
	t.is(result, expected);
});

test('composeTextFragments - multiple style objects', t => {
	const fragments: TextFragment[] = [
		{
			text: 'Hello',
			styles: [{bold: true}, {color: 'red'}, {underline: true}],
		},
	];
	const result = composeTextFragments(fragments);
	// Styles should be applied in order
	const expected = chalk.underline(chalk.red(chalk.bold('Hello')));
	t.is(result, expected);
});

test('composeTextFragments - transform function', t => {
	const fragments: TextFragment[] = [
		'Count: ',
		{
			text: '5',
			transform: text => `[${text}]`,
		},
	];
	const result = composeTextFragments(fragments);
	t.is(result, 'Count: [5]');
});

test('composeTextFragments - transform function with index', t => {
	const fragments: TextFragment[] = [
		'Item ',
		{
			text: 'test',
			transform: (text, index) => `${index}:${text}`,
		},
	];
	const result = composeTextFragments(fragments);
	t.is(result, 'Item 1:test');
});

test('composeTextFragments - transform and styles', t => {
	const fragments: TextFragment[] = [
		'Count: ',
		{
			text: '5',
			transform: text => `[${text}]`,
			styles: [{bold: true, color: 'yellow'}],
		},
	];
	const result = composeTextFragments(fragments);
	const expected = `Count: ${chalk.bold(chalk.yellow('[5]'))}`;
	t.is(result, expected);
});

test('composeTextFragments - complex mixed fragments', t => {
	const fragments: TextFragment[] = [
		'Hello ',
		{
			text: 'beautiful',
			styles: [{italic: true, color: 'magenta'}],
		},
		' ',
		{
			text: 'world',
			styles: [{bold: true, backgroundColor: 'white', color: 'black'}],
			transform: text => text.toUpperCase(),
		},
		'!',
	];
	const result = composeTextFragments(fragments);
	const expected = `Hello ${chalk.italic(chalk.magenta('beautiful'))} ${chalk.bold(chalk.bgWhite(chalk.black('WORLD')))}!`;
	t.is(result, expected);
});

test('composeTextFragments - color formats', t => {
	// Test hex color
	const hexResult = composeTextFragments([
		{
			text: 'Hex',
			styles: [{color: '#ff0000'}],
		},
	]);
	t.is(hexResult, chalk.hex('#ff0000')('Hex'));

	// Test rgb color
	const rgbResult = composeTextFragments([
		{
			text: 'RGB',
			styles: [{color: 'rgb(0, 255, 0)'}],
		},
	]);
	t.is(rgbResult, chalk.rgb(0, 255, 0)('RGB'));
});

test('composeTextFragments - error on invalid input type', t => {
	t.throws(
		() => {
			// @ts-expect-error - Testing runtime validation
			composeTextFragments('not an array');
		},
		{instanceOf: TypeError, message: 'Expected an array of fragments'},
	);
});

test('composeTextFragments - error on invalid fragment type', t => {
	t.throws(
		() => {
			// @ts-expect-error - Testing runtime validation
			composeTextFragments([123]);
		},
		{
			instanceOf: TypeError,
			message: 'Fragment at index 0 must be a string or object',
		},
	);
});

test('composeTextFragments - error on null fragment', t => {
	t.throws(
		() => {
			// @ts-expect-error - Testing runtime validation
			composeTextFragments([null]);
		},
		{
			instanceOf: TypeError,
			message: 'Fragment at index 0 must be a string or object',
		},
	);
});

test('composeTextFragments - error on missing text property', t => {
	t.throws(
		() => {
			// @ts-expect-error - Testing runtime validation
			composeTextFragments([{styles: []}]);
		},
		{
			instanceOf: TypeError,
			message: "Fragment at index 0 must have a string 'text' property",
		},
	);
});

test('composeTextFragments - error on non-string text property', t => {
	t.throws(
		() => {
			// @ts-expect-error - Testing runtime validation
			composeTextFragments([{text: 123}]);
		},
		{
			instanceOf: TypeError,
			message: "Fragment at index 0 must have a string 'text' property",
		},
	);
});

test('composeTextFragments - error on non-function transform', t => {
	t.throws(
		() => {
			// @ts-expect-error - Testing runtime validation
			composeTextFragments([{text: 'hello', transform: 'not a function'}]);
		},
		{instanceOf: TypeError, message: 'Transform at index 0 must be a function'},
	);
});

test('composeTextFragments - handles empty text', t => {
	const fragments: TextFragment[] = ['Hello ', {text: ''}, 'World'];
	const result = composeTextFragments(fragments);
	t.is(result, 'Hello World');
});

test('composeTextFragments - handles undefined styles gracefully', t => {
	const fragments: TextFragment[] = [
		{
			text: 'Hello',
			styles: undefined,
		},
	];
	const result = composeTextFragments(fragments);
	t.is(result, 'Hello');
});

test('composeTextFragments - text content is preserved', t => {
	const fragments: TextFragment[] = [
		'Hello ',
		{
			text: 'World',
			styles: [{bold: true, color: 'green'}],
		},
		'!',
	];
	const result = composeTextFragments(fragments);
	const textContent = stripAnsi(result);
	t.is(textContent, 'Hello World!');
});

// Tests for Text component parity as requested by sindresorhus
test('composeTextFragments - parent background only', t => {
	const fragments: TextFragment[] = [
		{text: 'Hello'}, // No explicit styles needed
	];
	const parentBackground = 'blue';
	const result = composeTextFragments(fragments, parentBackground);
	const expected = chalk.bgBlue('Hello');
	t.is(result, expected);
});

test('composeTextFragments - fragment inverse only', t => {
	const fragments: TextFragment[] = [
		{text: 'Hello', styles: [{inverse: true}]},
	];
	const result = composeTextFragments(fragments);
	const expected = chalk.inverse('Hello');
	t.is(result, expected);
});

test('composeTextFragments - parent background and fragment inverse combined', t => {
	const fragments: TextFragment[] = [
		{text: 'Hello', styles: [{inverse: true}]},
	];
	const parentBackground = 'blue';
	const result = composeTextFragments(fragments, parentBackground);
	const expected = chalk.inverse(chalk.bgBlue('Hello'));
	t.is(result, expected);
});

test('composeTextFragments - dimColor support', t => {
	const fragments: TextFragment[] = [
		{text: 'Hello', styles: [{dimColor: true}]},
	];
	const result = composeTextFragments(fragments);
	const expected = chalk.dim('Hello');
	t.is(result, expected);
});

test('composeTextFragments - dimColor with color and background', t => {
	const fragments: TextFragment[] = [
		{
			text: 'Hello',
			styles: [{dimColor: true, color: 'red', backgroundColor: 'yellow'}],
		},
	];
	const result = composeTextFragments(fragments);
	const expected = chalk.bgYellow(chalk.red(chalk.dim('Hello')));
	t.is(result, expected);
});

test('composeTextFragments - complex background inheritance with multiple fragments', t => {
	const fragments: TextFragment[] = [
		{text: 'Hello ', styles: [{color: 'green'}]},
		{text: 'World', styles: [{inverse: true}]},
		{text: '!', styles: [{backgroundColor: 'red'}]},
	];
	const parentBackground = 'blue';
	const result = composeTextFragments(fragments, parentBackground);

	const expected =
		chalk.bgBlue(chalk.green('Hello ')) +
		chalk.inverse(chalk.bgBlue('World')) +
		chalk.bgRed('!');

	t.is(result, expected);
});
