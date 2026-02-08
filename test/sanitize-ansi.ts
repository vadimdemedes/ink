import test from 'ava';
import stripAnsi from 'strip-ansi';
import sanitizeAnsi from '../src/sanitize-ansi.js';

test('preserve plain text', t => {
	t.is(sanitizeAnsi('hello'), 'hello');
});

test('preserve SGR sequences', t => {
	const output = sanitizeAnsi('A\u001B[38:2::255:100:0mcolor\u001B[0mB');

	t.true(output.includes('\u001B[38:2::255:100:0m'));
	t.is(stripAnsi(output), 'AcolorB');
});

test('preserve OSC hyperlinks', t => {
	const output = sanitizeAnsi(
		'\u001B]8;;https://example.com\u001B\\link\u001B]8;;\u001B\\',
	);

	t.true(output.includes('\u001B]8;;https://example.com'));
	t.is(stripAnsi(output), 'link');
});

test('preserve OSC hyperlinks terminated by C1 ST', t => {
	const output = sanitizeAnsi(
		'\u001B]8;;https://example.com\u009Clink\u001B]8;;\u009C',
	);

	t.true(output.includes('\u001B]8;;https://example.com\u009C'));
	t.is(stripAnsi(output), 'link');
});

test('preserve C1 OSC hyperlinks terminated by C1 ST', t => {
	const input = '\u009D8;;https://example.com\u009Clink\u009D8;;\u009C';
	const output = sanitizeAnsi(input);

	t.true(output.includes('\u009D8;;https://example.com\u009C'));
	t.is(output, input);
});

test('preserve C1 OSC hyperlinks terminated by ESC ST', t => {
	const input = '\u009D8;;https://example.com\u001B\\link\u009D8;;\u001B\\';
	const output = sanitizeAnsi(input);

	t.true(output.includes('\u009D8;;https://example.com\u001B\\'));
	t.is(output, input);
});

test('preserve C1 OSC hyperlinks terminated by BEL', t => {
	const input = '\u009D8;;https://example.com\u0007link\u009D8;;\u0007';
	const output = sanitizeAnsi(input);

	t.true(output.includes('\u009D8;;https://example.com\u0007'));
	t.is(output, input);
});

test('strip non-SGR CSI sequences as complete units', t => {
	const output = sanitizeAnsi('A\u001B[>4;2mB\u001B[2 qC');

	t.false(output.includes('4;2m'));
	t.false(output.includes(' q'));
	t.is(stripAnsi(output), 'ABC');
});

test('strip C1 non-SGR CSI sequences as complete units', t => {
	const output = sanitizeAnsi('A\u009B>4;2mB\u009B2 qC');

	t.false(output.includes('4;2m'));
	t.false(output.includes(' q'));
	t.is(stripAnsi(output), 'ABC');
});

test('preserve C1 SGR CSI sequences', t => {
	const output = sanitizeAnsi('A\u009B31mgreen\u009B0mB');

	t.true(output.includes('\u009B31m'));
	t.is(stripAnsi(output), 'AgreenB');
});

test('strip private-parameter m-sequences that are not SGR', t => {
	const output = sanitizeAnsi('A\u001B[>4;2mB');

	t.false(output.includes('\u001B[>4;2m'));
	t.is(stripAnsi(output), 'AB');
});

test('strip tmux DCS passthrough wrappers with escaped ST payload terminators', t => {
	const wrappedHyperlinkStart =
		'\u001BPtmux;\u001B\u001B]8;;https://example.com\u001B\u001B\\\u001B\\';
	const wrappedHyperlinkEnd =
		'\u001BPtmux;\u001B\u001B]8;;\u001B\u001B\\\u001B\\';
	const output = sanitizeAnsi(
		`${wrappedHyperlinkStart}link${wrappedHyperlinkEnd}`,
	);

	t.false(output.includes('tmux;'));
	t.false(output.includes('\u001BP'));
	t.is(stripAnsi(output), 'link');
});

test('strip incomplete DCS passthrough sequences to avoid payload leaks', t => {
	const output = sanitizeAnsi('A\u001BPtmux;\u001Blink');

	t.false(output.includes('tmux;'));
	t.is(stripAnsi(output), 'A');
});

test('strip DCS control strings with BEL in payload until ST terminator', t => {
	const output = sanitizeAnsi('A\u001BPpayload\u0007still-payload\u001B\\B');

	t.false(output.includes('payload'));
	t.false(output.includes('still-payload'));
	t.is(stripAnsi(output), 'AB');
});

test('strip ESC SOS control strings as complete units', t => {
	const output = sanitizeAnsi('A\u001BXpayload\u001B\\B');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'AB');
});

test('strip ESC SOS control strings with C1 ST terminator', t => {
	const output = sanitizeAnsi('A\u001BXpayload\u009CB');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'AB');
});

test('strip C1 SOS control strings as complete units with C1 ST terminator', t => {
	const output = sanitizeAnsi('A\u0098payload\u009CB');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'AB');
});

test('strip C1 SOS control strings as complete units with ESC ST terminator', t => {
	const output = sanitizeAnsi('A\u0098payload\u001B\\B');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'AB');
});

test('strip ESC SOS with BEL terminator as malformed control string', t => {
	const output = sanitizeAnsi('A\u001BXpayload\u0007B');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('strip C1 SOS with BEL terminator as malformed control string', t => {
	const output = sanitizeAnsi('A\u0098payload\u0007B');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('strip incomplete ESC SOS control strings to avoid payload leaks', t => {
	const output = sanitizeAnsi('A\u001BXpayload');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('strip incomplete C1 SOS control strings to avoid payload leaks', t => {
	const output = sanitizeAnsi('A\u0098payload');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('strip SOS with escaped ESC in payload until final ST terminator', t => {
	const output = sanitizeAnsi('A\u001BXfoo\u001B\u001B\\bar\u001B\\B');

	t.false(output.includes('foo'));
	t.false(output.includes('bar'));
	t.is(stripAnsi(output), 'AB');
});

test('preserve SGR around stripped SOS control strings', t => {
	const output = sanitizeAnsi('A\u001B[31mR\u001B[0m\u001BXpayload\u001B\\B');

	t.true(output.includes('\u001B[31m'));
	t.true(output.includes('\u001B[0m'));
	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'ARB');
});

test('strip ESC ST sequences', t => {
	const output = sanitizeAnsi('A\u001B\\B');

	t.false(output.includes('\u001B\\'));
	t.is(stripAnsi(output), 'AB');
});

test('strip malformed ESC control sequences with intermediates and non-final bytes', t => {
	const output = sanitizeAnsi('A\u001B#\u0007payload');

	t.false(output.includes('payload'));
	t.is(stripAnsi(output), 'A');
});

test('strip incomplete CSI after preserving prior SGR content', t => {
	const output = sanitizeAnsi('A\u001B[31mB\u001B[');

	t.true(output.includes('\u001B[31m'));
	t.is(stripAnsi(output), 'AB');
});

test('strip standalone ST bytes', t => {
	const output = sanitizeAnsi('A\u009CB');

	t.false(output.includes('\u009C'));
	t.is(stripAnsi(output), 'AB');
});

test('strip standalone C1 control characters', t => {
	const output = sanitizeAnsi('A\u0085B\u008EC');

	t.false(output.includes('\u0085'));
	t.false(output.includes('\u008E'));
	t.is(stripAnsi(output), 'ABC');
});
