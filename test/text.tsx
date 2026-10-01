import test, {type TestContext} from 'node:test';
import React from 'react';
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

test('<Text> with undefined children', (t: TestContext) => {
	const output = renderToString(<Text />);
	t.assert.strictEqual(output, '');
});

test('<Text> with null children', (t: TestContext) => {
	const output = renderToString(<Text>{null}</Text>);
	t.assert.strictEqual(output, '');
});

test('tabs are measured and rendered without overwriting adjacent text', (t: TestContext) => {
	const output = renderToString(
		<Box width={20}>
			<Text>
				A<Text>{'\tB'}</Text>
			</Text>
			<Text>!</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A       B!');
});

test('expanded tabs participate in text wrapping', (t: TestContext) => {
	const output = renderToString(
		<Box width={5} flexDirection="column">
			<Text>{'A\tB'}</Text>
			<Text>!</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\n   B\n!');
});

test('tab stops account for styled wide characters', (t: TestContext) => {
	const originalLevel = chalk.level;
	chalk.level = 3;
	t.after(() => {
		chalk.level = originalLevel;
	});

	const output = renderToString(
		<Box width={20}>
			<Text>
				<Text color="red">界</Text>
				{'\tB'}
			</Text>
			<Text>!</Text>
		</Box>,
	);

	t.assert.strictEqual(output, chalk.red('界') + '      B!');
});

test('text with standard color', (t: TestContext) => {
	const output = renderToString(<Text color="green">Test</Text>);
	t.assert.strictEqual(output, chalk.green('Test'));
});

test('text with dim+bold', (t: TestContext) => {
	const originalLevel = chalk.level;
	chalk.level = 3;
	t.after(() => {
		chalk.level = originalLevel;
	});

	const output = renderToString(
		<Text dimColor bold>
			Test
		</Text>,
	);

	t.assert.strictEqual(stripAnsi(output), 'Test');
	t.assert.notStrictEqual(output, 'Test'); // Ensure ANSI codes are present
});

test('text with dimmed color', (t: TestContext) => {
	const output = renderToString(
		<Text dimColor color="green">
			Test
		</Text>,
	);

	t.assert.strictEqual(output, chalk.green.dim('Test'));
});

test('text with hex color', (t: TestContext) => {
	const output = renderToString(<Text color="#FF8800">Test</Text>);
	t.assert.strictEqual(output, chalk.hex('#FF8800')('Test'));
});

test('text with rgb color', (t: TestContext) => {
	const output = renderToString(<Text color="rgb(255, 136, 0)">Test</Text>);
	t.assert.strictEqual(output, chalk.rgb(255, 136, 0)('Test'));
});

test('text with ansi256 color', (t: TestContext) => {
	const output = renderToString(<Text color="ansi256(194)">Test</Text>);
	t.assert.strictEqual(output, chalk.ansi256(194)('Test'));
});

test('text with standard background color', (t: TestContext) => {
	const output = renderToString(<Text backgroundColor="green">Test</Text>);
	t.assert.strictEqual(output, chalk.bgGreen('Test'));
});

test('text with hex background color', (t: TestContext) => {
	const output = renderToString(<Text backgroundColor="#FF8800">Test</Text>);
	t.assert.strictEqual(output, chalk.bgHex('#FF8800')('Test'));
});

test('text with rgb background color', (t: TestContext) => {
	const output = renderToString(
		<Text backgroundColor="rgb(255, 136, 0)">Test</Text>,
	);

	t.assert.strictEqual(output, chalk.bgRgb(255, 136, 0)('Test'));
});

test('text with ansi256 background color', (t: TestContext) => {
	const output = renderToString(
		<Text backgroundColor="ansi256(194)">Test</Text>,
	);

	t.assert.strictEqual(output, chalk.bgAnsi256(194)('Test'));
});

test('text with inversion', (t: TestContext) => {
	const output = renderToString(<Text inverse>Test</Text>);
	t.assert.strictEqual(output, chalk.inverse('Test'));
});

// See https://github.com/vadimdemedes/ink/issues/867
test('text with empty-to-nonempty sibling does not wrap', (t: TestContext) => {
	function Test({show}: {readonly show?: boolean}) {
		return (
			<Box>
				<Text>
					{show ? 'x' : ''}
					hello
				</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender} = render(<Test />, {stdout, debug: true});
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'hello');

	rerender(<Test show />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'xhello');
});

test('remeasure text when text is changed', (t: TestContext) => {
	function Test({add}: {readonly add?: boolean}) {
		return (
			<Box>
				<Text>{add ? 'abcx' : 'abc'}</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender} = render(<Test />, {stdout, debug: true});
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'abc');

	rerender(<Test add />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'abcx');
});

test('remeasure text when text nodes are changed', (t: TestContext) => {
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
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'abc');

	rerender(<Test add />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'abcx');
});

// See https://github.com/vadimdemedes/ink/issues/743
// Without the fix, the output was ''.
test('text with content "constructor" wraps correctly', (t: TestContext) => {
	const output = renderToString(<Text>constructor</Text>);
	t.assert.strictEqual(output, 'constructor');
});

// See https://github.com/vadimdemedes/ink/issues/362
test('strip ANSI cursor movement sequences from text', (t: TestContext) => {
	// \x1b[1A = cursor up, \x1b[2K = clear line, \x1b[1B = cursor down
	// \x1b[32m = green (SGR, preserved), \x1b[0m = reset (SGR, preserved)
	const input =
		'\u{1B}[1A\u{1B}[2KStarting client ... \u{1B}[32mdone\u{1B}[0m\u{1B}[1B';

	const output = renderToString(
		<Box>
			<Text>{input}</Text>
		</Box>,
	);

	t.assert.strictEqual(output.includes('\u{1B}[1A'), false);
	t.assert.strictEqual(output.includes('\u{1B}[2K'), false);
	t.assert.strictEqual(output.includes('\u{1B}[1B'), false);
	t.assert.strictEqual(stripAnsi(output), 'Starting client ... done');
});

test('strip ANSI cursor position and erase sequences from text', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Text>{'Hello\u{1B}[5;10HWorld\u{1B}[2J!'}</Text>
		</Box>,
	);

	t.assert.strictEqual(output.includes('\u{1B}[5;10H'), false);
	t.assert.strictEqual(output.includes('\u{1B}[2J'), false);
	t.assert.strictEqual(stripAnsi(output), 'HelloWorld!');
});

test('preserve SGR color sequences in text', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Text>{'\u{1B}[32mgreen\u{1B}[0m normal'}</Text>
		</Box>,
	);

	t.assert.ok(output.includes('\u{1B}['));
	t.assert.strictEqual(stripAnsi(output), 'green normal');
});

test('preserve OSC hyperlink sequences in text', (t: TestContext) => {
	const output = renderText(
		'\u{1B}]8;;https://example.com\u{7}link\u{1B}]8;;\u{7}',
	);

	t.assert.ok(output.includes('\u{1B}]8;;'));
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('preserve OSC hyperlink sequences with ST terminator in text', (t: TestContext) => {
	const output = renderText(
		'\u{1B}]8;;https://example.com\u{1B}\\link\u{1B}]8;;\u{1B}\\',
	);

	t.assert.ok(output.includes('\u{1B}]8;;'));
	t.assert.ok(output.includes('\u{1B}\\'));
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('preserve C1 OSC sequences in text', (t: TestContext) => {
	const input = '\u{9D}8;;https://example.com\u{7}link\u{9D}8;;\u{7}';
	const output = renderText(input);

	t.assert.ok(output.includes('\u{1B}]8;;https://example.com'));
	t.assert.ok(output.includes('\u{1B}]8;;\u{7}'));
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('preserve C1 OSC hyperlink sequences with ST terminator in text', (t: TestContext) => {
	const input = '\u{9D}8;;https://example.com\u{1B}\\link\u{9D}8;;\u{1B}\\';
	const output = renderText(input);

	t.assert.ok(output.includes('\u{1B}]8;;https://example.com'));
	t.assert.ok(output.includes('\u{1B}\\'));
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('preserve colors encoded with colon parameters', (t: TestContext) => {
	const output = renderText('A\u{1B}[38:2::255:100:0mcolor\u{1B}[0mB');

	t.assert.strictEqual(
		output,
		renderText('A\u{1B}[38;2;255;100;0mcolor\u{1B}[0mB'),
	);
	t.assert.ok(output.includes('\u{1B}[38;2;255;100;0m'));
	t.assert.strictEqual(stripAnsi(output), 'AcolorB');
});

test('strip complete non-SGR CSI sequences without leaking parameters', (t: TestContext) => {
	const input = 'A\u{1B}[>4;2mB\u{1B}[2 qC';
	const output = renderText(input);

	t.assert.strictEqual(output.includes('4;2m'), false);
	t.assert.strictEqual(output.includes(' q'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip complete C1 non-SGR CSI sequences without leaking parameters', (t: TestContext) => {
	const output = renderText('A\u{9B}>4;2mB\u{9B}2 qC');

	t.assert.strictEqual(output.includes('4;2m'), false);
	t.assert.strictEqual(output.includes(' q'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip complete ESC control sequences with intermediates', (t: TestContext) => {
	const output = renderText('A\u{1B}#8B\u{1B}cC');

	t.assert.strictEqual(output.includes('\u{1B}#8'), false);
	t.assert.strictEqual(output.includes('\u{1B}c'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip tmux DCS passthrough wrappers without leaking payload', (t: TestContext) => {
	const wrappedHyperlinkStart =
		'\u{1B}Ptmux;\u{1B}\u{1B}]8;;https://example.com\u{7}\u{1B}\\';
	const wrappedHyperlinkEnd = '\u{1B}Ptmux;\u{1B}\u{1B}]8;;\u{7}\u{1B}\\';
	const output = renderText(
		`${wrappedHyperlinkStart}link${wrappedHyperlinkEnd}`,
	);

	t.assert.strictEqual(output.includes('tmux;'), false);
	t.assert.strictEqual(output.includes('\u{1B}P'), false);
	t.assert.strictEqual(output.includes('\u{1B}\\'), false);
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('strip tmux DCS passthrough wrappers with ST-terminated OSC payload', (t: TestContext) => {
	const wrappedHyperlinkStart =
		'\u{1B}Ptmux;\u{1B}\u{1B}]8;;https://example.com\u{1B}\u{1B}\\\u{1B}\\';
	const wrappedHyperlinkEnd =
		'\u{1B}Ptmux;\u{1B}\u{1B}]8;;\u{1B}\u{1B}\\\u{1B}\\';
	const output = renderText(
		`${wrappedHyperlinkStart}link${wrappedHyperlinkEnd}`,
	);

	t.assert.strictEqual(output.includes('tmux;'), false);
	t.assert.strictEqual(output.includes('\u{1B}\\'), false);
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('strip C1 DCS control strings as complete units', (t: TestContext) => {
	const output = renderText('A\u{90}payload\u{1B}\\B\u{90}payload\u{9C}C');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip PM and APC control strings as complete units', (t: TestContext) => {
	const output = renderText(
		'A\u{1B}^pm-payload\u{1B}\\B\u{1B}_apc-payload\u{1B}\\C',
	);

	t.assert.strictEqual(output.includes('pm-payload'), false);
	t.assert.strictEqual(output.includes('apc-payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip C1 PM and APC control strings as complete units', (t: TestContext) => {
	const output = renderText('A\u{9E}pm-payload\u{9C}B\u{9F}apc-payload\u{9C}C');

	t.assert.strictEqual(output.includes('pm-payload'), false);
	t.assert.strictEqual(output.includes('apc-payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip ESC SOS control strings as complete units', (t: TestContext) => {
	const output = renderText('A\u{1B}Xpayload\u{1B}\\B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip C1 SOS control strings as complete units', (t: TestContext) => {
	const output = renderText('A\u{98}payload\u{1B}\\B\u{98}payload\u{9C}C');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip malformed SOS control strings to avoid payload leaks', (t: TestContext) => {
	const output = renderText('A\u{1B}Xpayload\u{7}B\u{98}payload');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('preserve SGR sequences around stripped SOS control strings', (t: TestContext) => {
	const output = renderText('A\u{1B}[32mgreen\u{1B}[0m\u{1B}Xpayload\u{1B}\\B');

	t.assert.ok(output.includes('\u{1B}['));
	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'AgreenB');
});

test('strip tmux DCS passthrough containing BEL until the final ST terminator', (t: TestContext) => {
	const input = 'A\u{1B}Ptmux;\u{1B}\u{1B}]0;title\u{7}\u{1B}\\B';
	const output = renderText(input);

	t.assert.strictEqual(output.includes('tmux;'), false);
	t.assert.strictEqual(output.includes('title'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip incomplete DCS passthrough sequences to avoid payload leaks', (t: TestContext) => {
	const incompleteSequence = '\u{1B}Ptmux;\u{1B}';
	const output = renderText(`${incompleteSequence}link`);

	t.assert.strictEqual(output.includes('tmux;'), false);
	t.assert.strictEqual(stripAnsi(output), '');
});

test('strip incomplete C1 DCS control strings to avoid payload leaks', (t: TestContext) => {
	const output = renderText('A\u{90}payload');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip incomplete OSC control strings to avoid payload leaks', (t: TestContext) => {
	const output = renderText('A\u{1B}]8;;https://example.comlink');

	t.assert.strictEqual(output.includes('https://example.com'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip incomplete C1 OSC control strings to avoid payload leaks', (t: TestContext) => {
	const output = renderText('A\u{9D}8;;https://example.comlink');

	t.assert.strictEqual(output.includes('https://example.com'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip incomplete ESC control sequences with intermediates to avoid payload leaks', (t: TestContext) => {
	const output = renderText('A\u{1B}#');

	t.assert.strictEqual(output.includes('\u{1B}#'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip malformed ESC control sequences with intermediates and non-final bytes', (t: TestContext) => {
	const output = renderText('A\u{1B}#\u{7}payload');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip standalone ST bytes from text output', (t: TestContext) => {
	const output = renderText('A\u{9C}B');

	t.assert.strictEqual(output.includes('\u{9C}'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip standalone C1 control characters from text output', (t: TestContext) => {
	const output = renderText('A\u{85}B\u{8E}C');

	t.assert.strictEqual(output.includes('\u{85}'), false);
	t.assert.strictEqual(output.includes('\u{8E}'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

// Concurrent mode tests
test('<Text> with undefined children - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(<Text />);
	t.assert.strictEqual(output, '');
});

test('<Text> with null children - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(<Text>{null}</Text>);
	t.assert.strictEqual(output, '');
});

test('text with standard color - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(<Text color="green">Test</Text>);
	t.assert.strictEqual(output, chalk.green('Test'));
});

test('text with dim+bold - concurrent', async (t: TestContext) => {
	const originalLevel = chalk.level;
	chalk.level = 3;
	t.after(() => {
		chalk.level = originalLevel;
	});

	const output = await renderToStringAsync(
		<Text dimColor bold>
			Test
		</Text>,
	);

	t.assert.strictEqual(stripAnsi(output), 'Test');
	t.assert.notStrictEqual(output, 'Test'); // Ensure ANSI codes are present
});

test('text with hex color - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(<Text color="#FF8800">Test</Text>);
	t.assert.strictEqual(output, chalk.hex('#FF8800')('Test'));
});

test('text with inversion - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(<Text inverse>Test</Text>);
	t.assert.strictEqual(output, chalk.inverse('Test'));
});

test('remeasure text when text is changed - concurrent', async (t: TestContext) => {
	function Test({add}: {readonly add?: boolean}) {
		return (
			<Box>
				<Text>{add ? 'abcx' : 'abc'}</Text>
			</Box>
		);
	}

	const {getOutput, rerenderAsync} = await renderAsync(<Test />);
	t.assert.strictEqual(getOutput(), 'abc');

	await rerenderAsync(<Test add />);
	t.assert.strictEqual(getOutput(), 'abcx');
});

test('remeasure text when text nodes are changed - concurrent', async (t: TestContext) => {
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
	t.assert.strictEqual(getOutput(), 'abc');

	await rerenderAsync(<Test add />);
	t.assert.strictEqual(getOutput(), 'abcx');
});
