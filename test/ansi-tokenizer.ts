import test from 'ava';
import {tokenizeAnsi} from '../src/ansi-tokenizer.js';

test('tokenize plain text', t => {
	t.deepEqual(tokenizeAnsi('hello'), [{type: 'text', value: 'hello'}]);
});

test('tokenize ESC CSI SGR sequence', t => {
	const tokens = tokenizeAnsi('A\u001B[31mB');

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'csi', 'text'],
	);
	t.deepEqual(tokens[0], {type: 'text', value: 'A'});
	t.deepEqual(tokens[2], {type: 'text', value: 'B'});

	const csiToken = tokens[1];
	if (csiToken?.type !== 'csi') {
		t.fail();
		return;
	}

	t.is(csiToken.value, '\u001B[31m');
	t.is(csiToken.parameterString, '31');
	t.is(csiToken.intermediateString, '');
	t.is(csiToken.finalCharacter, 'm');
});

test('tokenize C1 CSI sequence', t => {
	const tokens = tokenizeAnsi('A\u009B2 qB');
	const csiToken = tokens[1];

	if (csiToken?.type !== 'csi') {
		t.fail();
		return;
	}

	t.is(csiToken.value, '\u009B2 q');
	t.is(csiToken.parameterString, '2');
	t.is(csiToken.intermediateString, ' ');
	t.is(csiToken.finalCharacter, 'q');
});

test('tokenize OSC control string with ST terminator', t => {
	const tokens = tokenizeAnsi('A\u001B]8;;https://example.com\u001B\\B');
	const oscToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.fail();
		return;
	}

	t.is(oscToken.value, '\u001B]8;;https://example.com\u001B\\');
});

test('tokenize tmux DCS passthrough as one control string token', t => {
	const tokens = tokenizeAnsi(
		'A\u001BPtmux;\u001B\u001B]8;;https://example.com\u001B\u001B\\\u001B\\B',
	);
	const dcsToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'dcs', 'text'],
	);
	if (dcsToken?.type !== 'dcs') {
		t.fail();
		return;
	}

	t.true(dcsToken.value.startsWith('\u001BPtmux;'));
	t.true(dcsToken.value.endsWith('\u001B\\'));
});

test('tokenize incomplete CSI as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u001B[');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u001B['},
	]);
});

test('tokenize incomplete ESC intermediate sequence as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u001B#');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u001B#'},
	]);
});

test('ignore lone ESC before non-final byte', t => {
	const tokens = tokenizeAnsi('A\u001B\u0007B');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'text', value: '\u0007B'},
	]);
});

test('tokenize ESC ST sequence as ESC token', t => {
	const tokens = tokenizeAnsi('A\u001B\\B');
	const escToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'esc', 'text'],
	);
	if (escToken?.type !== 'esc') {
		t.fail();
		return;
	}

	t.is(escToken.value, '\u001B\\');
	t.is(escToken.intermediateString, '');
	t.is(escToken.finalCharacter, '\\');
});

test('tokenize C1 OSC with C1 ST terminator', t => {
	const tokens = tokenizeAnsi('A\u009D8;;https://example.com\u009CB');
	const oscToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.fail();
		return;
	}

	t.is(oscToken.value, '\u009D8;;https://example.com\u009C');
});

test('tokenize C1 OSC with ESC ST terminator', t => {
	const tokens = tokenizeAnsi('A\u009D8;;https://example.com\u001B\\B');
	const oscToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.fail();
		return;
	}

	t.is(oscToken.value, '\u009D8;;https://example.com\u001B\\');
});

test('tokenize C1 SGR CSI sequence', t => {
	const tokens = tokenizeAnsi('A\u009B31mB');
	const csiToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'csi', 'text'],
	);
	if (csiToken?.type !== 'csi') {
		t.fail();
		return;
	}

	t.is(csiToken.value, '\u009B31m');
	t.is(csiToken.parameterString, '31');
	t.is(csiToken.intermediateString, '');
	t.is(csiToken.finalCharacter, 'm');
});

test('tokenize incomplete C1 CSI as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u009B31');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u009B31'},
	]);
});

test('tokenize incomplete C1 OSC as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u009D8;;https://example.com');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u009D8;;https://example.com'},
	]);
});

test('tokenize DCS with BEL in payload until ST terminator', t => {
	const tokens = tokenizeAnsi('A\u001BPpayload\u0007still-payload\u001B\\B');
	const dcsToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'dcs', 'text'],
	);
	if (dcsToken?.type !== 'dcs') {
		t.fail();
		return;
	}

	t.true(dcsToken.value.includes('\u0007'));
	t.true(dcsToken.value.endsWith('\u001B\\'));
});

test('tokenize C1 OSC control string with BEL terminator', t => {
	const tokens = tokenizeAnsi('A\u009D8;;https://example.com\u0007B');
	const oscToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.fail();
		return;
	}

	t.is(oscToken.value, '\u009D8;;https://example.com\u0007');
});

test('tokenize ESC SOS control string with ST terminator', t => {
	const tokens = tokenizeAnsi('A\u001BXpayload\u001B\\B');
	const sosToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.fail();
		return;
	}

	t.is(sosToken.value, '\u001BXpayload\u001B\\');
});

test('tokenize ESC SOS control string with C1 ST terminator', t => {
	const tokens = tokenizeAnsi('A\u001BXpayload\u009CB');
	const sosToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.fail();
		return;
	}

	t.is(sosToken.value, '\u001BXpayload\u009C');
});

test('tokenize C1 SOS control string with C1 ST terminator', t => {
	const tokens = tokenizeAnsi('A\u0098payload\u009CB');
	const sosToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.fail();
		return;
	}

	t.is(sosToken.value, '\u0098payload\u009C');
});

test('tokenize C1 SOS control string with ESC ST terminator', t => {
	const tokens = tokenizeAnsi('A\u0098payload\u001B\\B');
	const sosToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.fail();
		return;
	}

	t.is(sosToken.value, '\u0098payload\u001B\\');
});

test('tokenize ESC SOS with BEL terminator as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u001BXpayload\u0007B');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u001BXpayload\u0007B'},
	]);
});

test('tokenize C1 SOS with BEL terminator as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u0098payload\u0007B');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u0098payload\u0007B'},
	]);
});

test('tokenize incomplete C1 SOS as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u0098payload');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u0098payload'},
	]);
});

test('tokenize incomplete ESC SOS as invalid and stop', t => {
	const tokens = tokenizeAnsi('A\u001BXpayload');

	t.deepEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u001BXpayload'},
	]);
});

test('tokenize SOS with escaped ESC in payload until final ST terminator', t => {
	const tokens = tokenizeAnsi('A\u001BXfoo\u001B\u001B\\bar\u001B\\B');
	const sosToken = tokens[1];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.fail();
		return;
	}

	t.true(sosToken.value.includes('\u001B\u001B\\'));
	t.true(sosToken.value.endsWith('\u001B\\'));
});

test('tokenize standalone C1 controls as c1 tokens', t => {
	const tokens = tokenizeAnsi('A\u0085B\u008EC');
	const c1Token1 = tokens[1];
	const c1Token2 = tokens[3];

	t.deepEqual(
		tokens.map(token => token.type),
		['text', 'c1', 'text', 'c1', 'text'],
	);
	if (c1Token1?.type !== 'c1') {
		t.fail();
		return;
	}

	if (c1Token2?.type !== 'c1') {
		t.fail();
		return;
	}

	t.is(c1Token1.value, '\u0085');
	t.is(c1Token2.value, '\u008E');
});
