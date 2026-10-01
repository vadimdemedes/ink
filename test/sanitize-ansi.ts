import test, {type TestContext} from 'node:test';
import stripAnsi from 'strip-ansi';
import sanitizeAnsi from '../src/sanitize-ansi.js';

test('preserve plain text', (t: TestContext) => {
	t.assert.strictEqual(sanitizeAnsi('hello'), 'hello');
});

test('preserve SGR sequences', (t: TestContext) => {
	const input = 'A\u{1B}[1;4mtext\u{1B}[0mB';

	t.assert.strictEqual(sanitizeAnsi(input), input);
});

for (const [colon, semicolon] of [
	['38:5:196', '38;5;196'],
	['48:5:21', '48;5;21'],
	['38:2::255:0:0', '38;2;255;0;0'],
	['38:2:0:255:0:0', '38;2;255;0;0'],
	['38:2:255:0:0', '38;2;255;0;0'],
	['1;38:5:196;48:2::0:0:255', '1;38;5;196;48;2;0;0;255'],
] as const) {
	test(`normalize colon color parameters ${colon}`, (t: TestContext) => {
		t.assert.strictEqual(
			sanitizeAnsi(`\u{1B}[${colon}mcolor\u{1B}[0m`),
			`\u{1B}[${semicolon}mcolor\u{1B}[0m`,
		);
	});
}

for (const [colon, semicolon] of [
	['4:1', '4'],
	['4:3', '4'],
	['4:0', '24'],
	['4:', '24'],
	['1;4:3;31', '1;4;31'],
] as const) {
	test(`normalize underline style ${colon}`, (t: TestContext) => {
		t.assert.strictEqual(
			sanitizeAnsi(`\u{1B}[${colon}mtext\u{1B}[0m`),
			`\u{1B}[${semicolon}mtext\u{1B}[0m`,
		);
	});
}

for (const parameters of [
	'58:5:1',
	'58:2::1:2:3',
	'38:2:1:255:0:0',
	'38:5:196:0',
]) {
	test(`drop unsupported colon parameters ${parameters}`, (t: TestContext) => {
		t.assert.strictEqual(
			sanitizeAnsi(`\u{1B}[${parameters}mtext\u{1B}[0m`),
			'text\u{1B}[0m',
		);
	});
}

test('keep the remaining parameters when dropping colon parameters', (t: TestContext) => {
	t.assert.strictEqual(
		sanitizeAnsi('\u{1B}[1;58:5:1;31mtext\u{1B}[0m'),
		'\u{1B}[1;31mtext\u{1B}[0m',
	);
});

test('preserve empty SGR parameters', (t: TestContext) => {
	const input = 'A\u{1B}[mB\u{1B}[;1mC';

	t.assert.strictEqual(sanitizeAnsi(input), input);
});

test('defer SGR sequences until after combining marks', (t: TestContext) => {
	t.assert.strictEqual(
		sanitizeAnsi('e\u{1B}[31m\u{1B}[1m\u{301}X\u{1B}[39m'),
		'e\u{301}\u{1B}[31m\u{1B}[1mX\u{1B}[39m',
	);
});

test('defer a trailing SGR sequence past a combining mark', (t: TestContext) => {
	t.assert.strictEqual(
		sanitizeAnsi('e\u{1B}[31m\u{301}'),
		'e\u{301}\u{1B}[31m',
	);
});

test('keep deferred SGR sequences before a following hyperlink', (t: TestContext) => {
	t.assert.strictEqual(
		sanitizeAnsi('e\u{1B}[31m\u{301}\u{1B}]8;;https://example.com\u{1B}\\X'),
		'e\u{301}\u{1B}[31m\u{1B}]8;;https://example.com\u{1B}\\X',
	);
});

test('strip cursor controls before checking for combining marks', (t: TestContext) => {
	t.assert.strictEqual(
		sanitizeAnsi('e\u{1B}[31m\r\u{301}X'),
		'e\u{301}\u{1B}[31mX',
	);
});

test('preserve OSC hyperlinks', (t: TestContext) => {
	const output = sanitizeAnsi(
		'\u{1B}]8;;https://example.com\u{1B}\\link\u{1B}]8;;\u{1B}\\',
	);

	t.assert.ok(output.includes('\u{1B}]8;;https://example.com'));
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('preserve OSC hyperlinks terminated by C1 ST', (t: TestContext) => {
	const output = sanitizeAnsi(
		'\u{1B}]8;;https://example.com\u{9C}link\u{1B}]8;;\u{9C}',
	);

	t.assert.ok(output.includes('\u{1B}]8;;https://example.com\u{9C}'));
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('preserve C1 OSC hyperlinks terminated by C1 ST', (t: TestContext) => {
	const input = '\u{9D}8;;https://example.com\u{9C}link\u{9D}8;;\u{9C}';
	const output = sanitizeAnsi(input);

	t.assert.ok(output.includes('\u{9D}8;;https://example.com\u{9C}'));
	t.assert.strictEqual(output, input);
});

test('preserve C1 OSC hyperlinks terminated by ESC ST', (t: TestContext) => {
	const input = '\u{9D}8;;https://example.com\u{1B}\\link\u{9D}8;;\u{1B}\\';
	const output = sanitizeAnsi(input);

	t.assert.ok(output.includes('\u{9D}8;;https://example.com\u{1B}\\'));
	t.assert.strictEqual(output, input);
});

test('preserve C1 OSC hyperlinks terminated by BEL', (t: TestContext) => {
	const input = '\u{9D}8;;https://example.com\u{7}link\u{9D}8;;\u{7}';
	const output = sanitizeAnsi(input);

	t.assert.ok(output.includes('\u{9D}8;;https://example.com\u{7}'));
	t.assert.strictEqual(output, input);
});

test('strip non-SGR CSI sequences as complete units', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}[>4;2mB\u{1B}[2 qC');

	t.assert.strictEqual(output.includes('4;2m'), false);
	t.assert.strictEqual(output.includes(' q'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('strip C1 non-SGR CSI sequences as complete units', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{9B}>4;2mB\u{9B}2 qC');

	t.assert.strictEqual(output.includes('4;2m'), false);
	t.assert.strictEqual(output.includes(' q'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});

test('normalize C1 SGR CSI sequences to ESC form', (t: TestContext) => {
	t.assert.strictEqual(
		sanitizeAnsi('A\u{9B}31mgreen\u{9B}0mB'),
		'A\u{1B}[31mgreen\u{1B}[0mB',
	);
});

test('strip private-parameter m-sequences that are not SGR', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}[>4;2mB');

	t.assert.strictEqual(output.includes('\u{1B}[>4;2m'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip tmux DCS passthrough wrappers with escaped ST payload terminators', (t: TestContext) => {
	const wrappedHyperlinkStart =
		'\u{1B}Ptmux;\u{1B}\u{1B}]8;;https://example.com\u{1B}\u{1B}\\\u{1B}\\';
	const wrappedHyperlinkEnd =
		'\u{1B}Ptmux;\u{1B}\u{1B}]8;;\u{1B}\u{1B}\\\u{1B}\\';
	const output = sanitizeAnsi(
		`${wrappedHyperlinkStart}link${wrappedHyperlinkEnd}`,
	);

	t.assert.strictEqual(output.includes('tmux;'), false);
	t.assert.strictEqual(output.includes('\u{1B}P'), false);
	t.assert.strictEqual(stripAnsi(output), 'link');
});

test('strip incomplete DCS passthrough sequences to avoid payload leaks', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}Ptmux;\u{1B}link');

	t.assert.strictEqual(output.includes('tmux;'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip DCS control strings with BEL in payload until ST terminator', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}Ppayload\u{7}still-payload\u{1B}\\B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(output.includes('still-payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip ESC SOS control strings as complete units', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}Xpayload\u{1B}\\B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip ESC SOS control strings with C1 ST terminator', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}Xpayload\u{9C}B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip C1 SOS control strings as complete units with C1 ST terminator', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{98}payload\u{9C}B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip C1 SOS control strings as complete units with ESC ST terminator', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{98}payload\u{1B}\\B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip ESC SOS with BEL terminator as malformed control string', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}Xpayload\u{7}B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip C1 SOS with BEL terminator as malformed control string', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{98}payload\u{7}B');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip incomplete ESC SOS control strings to avoid payload leaks', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}Xpayload');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip incomplete C1 SOS control strings to avoid payload leaks', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{98}payload');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip SOS with escaped ESC in payload until final ST terminator', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}Xfoo\u{1B}\u{1B}\\bar\u{1B}\\B');

	t.assert.strictEqual(output.includes('foo'), false);
	t.assert.strictEqual(output.includes('bar'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('preserve SGR around stripped SOS control strings', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}[31mR\u{1B}[0m\u{1B}Xpayload\u{1B}\\B');

	t.assert.ok(output.includes('\u{1B}[31m'));
	t.assert.ok(output.includes('\u{1B}[0m'));
	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'ARB');
});

test('strip ESC ST sequences', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}\\B');

	t.assert.strictEqual(output.includes('\u{1B}\\'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip malformed ESC control sequences with intermediates and non-final bytes', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}#\u{7}payload');

	t.assert.strictEqual(output.includes('payload'), false);
	t.assert.strictEqual(stripAnsi(output), 'A');
});

test('strip incomplete CSI after preserving prior SGR content', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{1B}[31mB\u{1B}[');

	t.assert.ok(output.includes('\u{1B}[31m'));
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip standalone ST bytes', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{9C}B');

	t.assert.strictEqual(output.includes('\u{9C}'), false);
	t.assert.strictEqual(stripAnsi(output), 'AB');
});

test('strip standalone C1 control characters', (t: TestContext) => {
	const output = sanitizeAnsi('A\u{85}B\u{8E}C');

	t.assert.strictEqual(output.includes('\u{85}'), false);
	t.assert.strictEqual(output.includes('\u{8E}'), false);
	t.assert.strictEqual(stripAnsi(output), 'ABC');
});
