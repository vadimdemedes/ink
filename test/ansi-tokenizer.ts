import test, {type TestContext} from 'node:test';
import {tokenizeAnsi} from '../src/ansi-tokenizer.js';

test('tokenize plain text', (t: TestContext) => {
	t.assert.deepStrictEqual(tokenizeAnsi('hello'), [
		{type: 'text', value: 'hello'},
	]);
});

test('tokenize ESC CSI SGR sequence', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}[31mB');

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'csi', 'text'],
	);
	t.assert.deepStrictEqual(tokens[0], {type: 'text', value: 'A'});
	t.assert.deepStrictEqual(tokens[2], {type: 'text', value: 'B'});

	const csiToken = tokens[1];
	if (csiToken?.type !== 'csi') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(csiToken.value, '\u{1B}[31m');
	t.assert.strictEqual(csiToken.parameterString, '31');
	t.assert.strictEqual(csiToken.intermediateString, '');
	t.assert.strictEqual(csiToken.finalCharacter, 'm');
});

test('tokenize C1 CSI sequence', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{9B}2 qB');
	const csiToken = tokens[1];

	if (csiToken?.type !== 'csi') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(csiToken.value, '\u{9B}2 q');
	t.assert.strictEqual(csiToken.parameterString, '2');
	t.assert.strictEqual(csiToken.intermediateString, ' ');
	t.assert.strictEqual(csiToken.finalCharacter, 'q');
});

test('tokenize OSC control string with ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}]8;;https://example.com\u{1B}\\B');
	const oscToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(oscToken.value, '\u{1B}]8;;https://example.com\u{1B}\\');
});

test('tokenize tmux DCS passthrough as one control string token', (t: TestContext) => {
	const tokens = tokenizeAnsi(
		'A\u{1B}Ptmux;\u{1B}\u{1B}]8;;https://example.com\u{1B}\u{1B}\\\u{1B}\\B',
	);
	const dcsToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'dcs', 'text'],
	);
	if (dcsToken?.type !== 'dcs') {
		t.assert.fail();
		return;
	}

	t.assert.ok(dcsToken.value.startsWith('\u{1B}Ptmux;'));
	t.assert.ok(dcsToken.value.endsWith('\u{1B}\\'));
});

test('tokenize incomplete CSI as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}[');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{1B}['},
	]);
});

test('tokenize incomplete ESC intermediate sequence as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}#');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{1B}#'},
	]);
});

test('ignore lone ESC before non-final byte', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}\u{7}B');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'text', value: '\u{7}B'},
	]);
});

test('tokenize ESC ST sequence as ESC token', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}\\B');
	const escToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'esc', 'text'],
	);
	if (escToken?.type !== 'esc') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(escToken.value, '\u{1B}\\');
	t.assert.strictEqual(escToken.intermediateString, '');
	t.assert.strictEqual(escToken.finalCharacter, '\\');
});

test('tokenize C1 OSC with C1 ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{9D}8;;https://example.com\u{9C}B');
	const oscToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(oscToken.value, '\u{9D}8;;https://example.com\u{9C}');
});

test('tokenize C1 OSC with ESC ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{9D}8;;https://example.com\u{1B}\\B');
	const oscToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(oscToken.value, '\u{9D}8;;https://example.com\u{1B}\\');
});

test('tokenize C1 SGR CSI sequence', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{9B}31mB');
	const csiToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'csi', 'text'],
	);
	if (csiToken?.type !== 'csi') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(csiToken.value, '\u{9B}31m');
	t.assert.strictEqual(csiToken.parameterString, '31');
	t.assert.strictEqual(csiToken.intermediateString, '');
	t.assert.strictEqual(csiToken.finalCharacter, 'm');
});

test('tokenize incomplete C1 CSI as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{9B}31');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{9B}31'},
	]);
});

test('tokenize incomplete C1 OSC as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{9D}8;;https://example.com');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{9D}8;;https://example.com'},
	]);
});

test('tokenize DCS with BEL in payload until ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}Ppayload\u{7}still-payload\u{1B}\\B');
	const dcsToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'dcs', 'text'],
	);
	if (dcsToken?.type !== 'dcs') {
		t.assert.fail();
		return;
	}

	t.assert.ok(dcsToken.value.includes('\u{7}'));
	t.assert.ok(dcsToken.value.endsWith('\u{1B}\\'));
});

test('tokenize C1 OSC control string with BEL terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{9D}8;;https://example.com\u{7}B');
	const oscToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'osc', 'text'],
	);
	if (oscToken?.type !== 'osc') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(oscToken.value, '\u{9D}8;;https://example.com\u{7}');
});

test('tokenize ESC SOS control string with ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}Xpayload\u{1B}\\B');
	const sosToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(sosToken.value, '\u{1B}Xpayload\u{1B}\\');
});

test('tokenize ESC SOS control string with C1 ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}Xpayload\u{9C}B');
	const sosToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(sosToken.value, '\u{1B}Xpayload\u{9C}');
});

test('tokenize C1 SOS control string with C1 ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{98}payload\u{9C}B');
	const sosToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(sosToken.value, '\u{98}payload\u{9C}');
});

test('tokenize C1 SOS control string with ESC ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{98}payload\u{1B}\\B');
	const sosToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(sosToken.value, '\u{98}payload\u{1B}\\');
});

test('tokenize ESC SOS with BEL terminator as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}Xpayload\u{7}B');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{1B}Xpayload\u{7}B'},
	]);
});

test('tokenize C1 SOS with BEL terminator as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{98}payload\u{7}B');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{98}payload\u{7}B'},
	]);
});

test('tokenize incomplete C1 SOS as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{98}payload');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{98}payload'},
	]);
});

test('tokenize incomplete ESC SOS as invalid and stop', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}Xpayload');

	t.assert.deepStrictEqual(tokens, [
		{type: 'text', value: 'A'},
		{type: 'invalid', value: '\u{1B}Xpayload'},
	]);
});

test('tokenize SOS with escaped ESC in payload until final ST terminator', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{1B}Xfoo\u{1B}\u{1B}\\bar\u{1B}\\B');
	const sosToken = tokens[1];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'sos', 'text'],
	);
	if (sosToken?.type !== 'sos') {
		t.assert.fail();
		return;
	}

	t.assert.ok(sosToken.value.includes('\u{1B}\u{1B}\\'));
	t.assert.ok(sosToken.value.endsWith('\u{1B}\\'));
});

test('tokenize standalone C1 controls as c1 tokens', (t: TestContext) => {
	const tokens = tokenizeAnsi('A\u{85}B\u{8E}C');
	const c1Token1 = tokens[1];
	const c1Token2 = tokens[3];

	t.assert.deepStrictEqual(
		tokens.map(token => token.type),
		['text', 'c1', 'text', 'c1', 'text'],
	);
	if (c1Token1?.type !== 'c1') {
		t.assert.fail();
		return;
	}

	if (c1Token2?.type !== 'c1') {
		t.assert.fail();
		return;
	}

	t.assert.strictEqual(c1Token1.value, '\u{85}');
	t.assert.strictEqual(c1Token2.value, '\u{8E}');
});
