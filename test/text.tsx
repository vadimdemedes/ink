import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import {render, Box, Text} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';
import {renderAsync} from './helpers/test-renderer.js';

const renderText = (text: string): string =>
	renderToString(
		<Box>
			<Text>{text}</Text>
		</Box>,
	);

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

test('text with dim+bold', t => {
	const output = renderToString(
		<Text dimColor bold>
			Test
		</Text>,
	);

	t.is(stripAnsi(output), 'Test');
	t.not(output, 'Test'); // Ensure ANSI codes are present
});

test('text with dimmed color', t => {
	const output = renderToString(
		<Text dimColor color="green">
			Test
		</Text>,
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
		<Text backgroundColor="rgb(255, 136, 0)">Test</Text>,
	);

	t.is(output, chalk.bgRgb(255, 136, 0)('Test'));
});

test('text with ansi256 background color', t => {
	const output = renderToString(
		<Text backgroundColor="ansi256(194)">Test</Text>,
	);

	t.is(output, chalk.bgAnsi256(194)('Test'));
});

test('text with inversion', t => {
	const output = renderToString(<Text inverse>Test</Text>);
	t.is(output, chalk.inverse('Test'));
});

// See https://github.com/vadimdemedes/ink/issues/867
test('text with empty-to-nonempty sibling does not wrap', t => {
	function Test({show}: {readonly show?: boolean}) {
		return (
			<Box>
				<Text>
					{show ? 'x' : ''}
					{'hello'}
				</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender} = render(<Test />, {stdout, debug: true});
	t.is((stdout.write as any).lastCall.args[0], 'hello');

	rerender(<Test show />);
	t.is((stdout.write as any).lastCall.args[0], 'xhello');
});

test('remeasure text when text is changed', t => {
	function Test({add}: {readonly add?: boolean}) {
		return (
			<Box>
				<Text>{add ? 'abcx' : 'abc'}</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender} = render(<Test />, {stdout, debug: true});
	t.is((stdout.write as any).lastCall.args[0], 'abc');

	rerender(<Test add />);
	t.is((stdout.write as any).lastCall.args[0], 'abcx');
});

test('remeasure text when text nodes are changed', t => {
	function Test({add}: {readonly add?: boolean}) {
		return (
			<Box>
				<Text>
					abc
					{add ? <Text>x</Text> : null}
				</Text>
			</Box>
		);
	}

	const stdout = createStdout();

	const {rerender} = render(<Test />, {stdout, debug: true});
	t.is((stdout.write as any).lastCall.args[0], 'abc');

	rerender(<Test add />);
	t.is((stdout.write as any).lastCall.args[0], 'abcx');
});

// See https://github.com/vadimdemedes/ink/issues/743
// Without the fix, the output was ''.
test('text with content "constructor" wraps correctly', t => {
	const output = renderToString(<Text>constructor</Text>);
	t.is(output, 'constructor');
});

// See https://github.com/vadimdemedes/ink/issues/362
test('strip ANSI cursor movement sequences from text', t => {
	// \x1b[1A = cursor up, \x1b[2K = clear line, \x1b[1B = cursor down
	// \x1b[32m = green (SGR, preserved), \x1b[0m = reset (SGR, preserved)
	const input =
		'\u001B[1A\u001B[2KStarting client ... \u001B[32mdone\u001B[0m\u001B[1B';

	const output = renderToString(
		<Box>
			<Text>{input}</Text>
		</Box>,
	);

	t.false(output.includes('\u001B[1A'));
	t.false(output.includes('\u001B[2K'));
	t.false(output.includes('\u001B[1B'));
	t.is(stripAnsi(output), 'Starting client ... done');
});

test('strip ANSI cursor position and erase sequences from text', t => {
	const output = renderToString(
		<Box>
			<Text>{'Hello\u001B[5;10HWorld\u001B[2J!'}</Text>
		</Box>,
	);

	t.false(output.includes('\u001B[5;10H'));
	t.false(output.includes('\u001B[2J'));
	t.is(stripAnsi(output), 'HelloWorld!');
});

test('preserve SGR color sequences in text', t => {
	const output = renderToString(
		<Box>
			<Text>{'\u001B[32mgreen\u001B[0m normal'}</Text>
		</Box>,
	);

	t.true(output.includes('\u001B['));
	t.is(stripAnsi(output), 'green normal');
});

test('preserve OSC hyperlink sequences in text', t => {
	const output = renderText(
		'\u001B]8;;https://example.com\u0007link\u001B]8;;\u0007',
	);

	t.true(output.includes('\u001B]8;;'));
	t.is(stripAnsi(output), 'link');
});

test('preserve OSC hyperlink sequences with ST terminator in text', t => {
	const output = renderText(
		'\u001B]8;;https://example.com\u001B\\link\u001B]8;;\u001B\\',
	);

	t.true(output.includes('\u001B]8;;'));
	t.true(output.includes('\u001B\\'));
	t.is(stripAnsi(output), 'link');
});

test('preserve C1 OSC sequences in text', t => {
	const input = '\u009D8;;https://example.com\u0007link\u009D8;;\u0007';
	const output = renderText(input);

	t.true(output.includes('\u009D8;;https://example.com'));
	t.true(output.includes('\u009D8;;\u0007'));
	t.is(output, input);
});

test('preserve C1 OSC hyperlink sequences with ST terminator in text', t => {
	const input = '\u009D8;;https://example.com\u001B\\link\u009D8;;\u001B\\';
	const output = renderText(input);

	t.true(output.includes('\u009D8;;https://example.com'));
	t.true(output.includes('\u001B\\'));
	t.is(output, input);
});

test('preserve SGR sequences with colon parameters', t => {
	const output = renderText('A\u001B[38:2::255:100:0mcolor\u001B[0mB');

	t.true(output.includes('\u001B[38:2::255:100:0m'));
	t.is(stripAnsi(output), 'AcolorB');
});

test('strip complete non-SGR CSI sequences without leaking parameters', t => {
	const input = 'A\u001B[>4;2mB\u001B[2 qC';
	const output = renderText(input);

	t.false(output.includes('4;2m'));
	t.false(output.includes(' q'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip complete C1 non-SGR CSI sequences without leaking parameters', t => {
	const output = renderText('A\u009B>4;2mB\u009B2 qC');

	t.false(output.includes('4;2m'));
	t.false(output.includes(' q'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip complete ESC control sequences with intermediates', t => {
	const output = renderText('A\u001B#8B\u001BcC');

	t.false(output.includes('\u001B#8'));
	t.false(output.includes('\u001Bc'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip tmux DCS passthrough wrappers without leaking payload', t => {
	const wrappedHyperlinkStart =
		'\u001BPtmux;\u001B\u001B]8;;https://example.com\u0007\u001B\\';
	const wrappedHyperlinkEnd = '\u001BPtmux;\u001B\u001B]8;;\u0007\u001B\\';
	const output = renderText(
		`${wrappedHyperlinkStart}link${wrappedHyperlinkEnd}`,
	);

	t.false(output.includes('tmux;'));
	t.false(output.includes('\u001BP'));
	t.false(output.includes('\u001B\\'));
	t.is(stripAnsi(output), 'link');
});

test('strip tmux DCS passthrough wrappers with ST-terminated OSC payload', t => {
	const wrappedHyperlinkStart =
		'\u001BPtmux;\u001B\u001B]8;;https://example.com\u001B\u001B\\\u001B\\';
	const wrappedHyperlinkEnd =
		'\u001BPtmux;\u001B\u001B]8;;\u001B\u001B\\\u001B\\';
	const output = renderText(
		`${wrappedHyperlinkStart}link${wrappedHyperlinkEnd}`,
	);

	t.false(output.includes('tmux;'));
	t.false(output.includes('\u001B\\'));
	t.is(stripAnsi(output), 'link');
});

test('strip C1 DCS control strings as complete units', t => {
	const output = renderText('A\u0090payload\u001B\\B\u0090payload\u009CC');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip PM and APC control strings as complete units', t => {
	const output = renderText(
		'A\u001B^pm-payload\u001B\\B\u001B_apc-payload\u001B\\C',
	);

	t.false(output.includes('pm-payload'));
	t.false(output.includes('apc-payload'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip C1 PM and APC control strings as complete units', t => {
	const output = renderText('A\u009Epm-payload\u009CB\u009Fapc-payload\u009CC');

	t.false(output.includes('pm-payload'));
	t.false(output.includes('apc-payload'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip ESC SOS control strings as complete units', t => {
	const output = renderText('A\u001BXpayload\u001B\\B');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'AB');
});

test('strip C1 SOS control strings as complete units', t => {
	const output = renderText('A\u0098payload\u001B\\B\u0098payload\u009CC');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip malformed SOS control strings to avoid payload leaks', t => {
	const output = renderText('A\u001BXpayload\u0007B\u0098payload');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('preserve SGR sequences around stripped SOS control strings', t => {
	const output = renderText('A\u001B[32mgreen\u001B[0m\u001BXpayload\u001B\\B');

	t.true(output.includes('\u001B['));
	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'AgreenB');
});

test('strip tmux DCS passthrough containing BEL until the final ST terminator', t => {
	const input = 'A\u001BPtmux;\u001B\u001B]0;title\u0007\u001B\\B';
	const output = renderText(input);

	t.false(output.includes('tmux;'));
	t.false(output.includes('title'));
	t.is(stripAnsi(output), 'AB');
});

test('strip incomplete DCS passthrough sequences to avoid payload leaks', t => {
	const incompleteSequence = '\u001BPtmux;\u001B';
	const output = renderText(`${incompleteSequence}link`);

	t.false(output.includes('tmux;'));
	t.is(stripAnsi(output), '');
});

test('strip incomplete C1 DCS control strings to avoid payload leaks', t => {
	const output = renderText('A\u0090payload');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('strip incomplete OSC control strings to avoid payload leaks', t => {
	const output = renderText('A\u001B]8;;https://example.comlink');

	t.false(output.includes('https://example.com'));
	t.is(stripAnsi(output), 'A');
});

test('strip incomplete C1 OSC control strings to avoid payload leaks', t => {
	const output = renderText('A\u009D8;;https://example.comlink');

	t.false(output.includes('https://example.com'));
	t.is(stripAnsi(output), 'A');
});

test('strip incomplete ESC control sequences with intermediates to avoid payload leaks', t => {
	const output = renderText('A\u001B#');

	t.false(output.includes('\u001B#'));
	t.is(stripAnsi(output), 'A');
});

test('strip malformed ESC control sequences with intermediates and non-final bytes', t => {
	const output = renderText('A\u001B#\u0007payload');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('strip standalone ST bytes from text output', t => {
	const output = renderText('A\u009CB');

	t.false(output.includes('\u009C'));
	t.is(stripAnsi(output), 'AB');
});

test('strip standalone C1 control characters from text output', t => {
	const output = renderText('A\u0085B\u008EC');

	t.false(output.includes('\u0085'));
	t.false(output.includes('\u008E'));
	t.is(stripAnsi(output), 'ABC');
});

// Concurrent mode tests
test('<Text> with undefined children - concurrent', async t => {
	const output = await renderToStringAsync(<Text />);
	t.is(output, '');
});

test('<Text> with null children - concurrent', async t => {
	const output = await renderToStringAsync(<Text>{null}</Text>);
	t.is(output, '');
});

test('text with standard color - concurrent', async t => {
	const output = await renderToStringAsync(<Text color="green">Test</Text>);
	t.is(output, chalk.green('Test'));
});

test('text with dim+bold - concurrent', async t => {
	const output = await renderToStringAsync(
		<Text dimColor bold>
			Test
		</Text>,
	);

	t.is(stripAnsi(output), 'Test');
	t.not(output, 'Test'); // Ensure ANSI codes are present
});

test('text with hex color - concurrent', async t => {
	const output = await renderToStringAsync(<Text color="#FF8800">Test</Text>);
	t.is(output, chalk.hex('#FF8800')('Test'));
});

test('text with inversion - concurrent', async t => {
	const output = await renderToStringAsync(<Text inverse>Test</Text>);
	t.is(output, chalk.inverse('Test'));
});

test('remeasure text when text is changed - concurrent', async t => {
	function Test({add}: {readonly add?: boolean}) {
		return (
			<Box>
				<Text>{add ? 'abcx' : 'abc'}</Text>
			</Box>
		);
	}

	const {getOutput, rerenderAsync} = await renderAsync(<Test />);
	t.is(getOutput(), 'abc');

	await rerenderAsync(<Test add />);
	t.is(getOutput(), 'abcx');
});

test('remeasure text when text nodes are changed - concurrent', async t => {
	function Test({add}: {readonly add?: boolean}) {
		return (
			<Box>
				<Text>
					abc
					{add ? <Text>x</Text> : null}
				</Text>
			</Box>
		);
	}

	const {getOutput, rerenderAsync} = await renderAsync(<Test />);
	t.is(getOutput(), 'abc');

	await rerenderAsync(<Test add />);
	t.is(getOutput(), 'abcx');
});
