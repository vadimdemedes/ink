import EventEmitter from 'node:events';
import {Readable} from 'node:stream';
import {setTimeout as delay} from 'node:timers/promises';
import test, {type TestContext} from 'node:test';
import React from 'react';
import {stub, spy} from 'sinon';
import parseKeypress from '../src/parse-keypress.js';
import {render, Text, useInput} from '../src/index.js';

const textEncoder = new TextEncoder();

// Helper to create kitty protocol CSI u sequences
const kittyKey = (
	codepoint: number,
	modifiers?: number,
	eventType?: number,
	textCodepoints?: number[],
): string => {
	let seq = `\u{1B}[${codepoint}`;
	if (
		modifiers !== undefined ||
		eventType !== undefined ||
		textCodepoints !== undefined
	) {
		seq += `;${modifiers ?? 1}`;
	}

	if (eventType !== undefined || textCodepoints !== undefined) {
		seq += `:${eventType ?? 1}`;
	}

	if (textCodepoints !== undefined) {
		seq += `;${textCodepoints.join(':')}`;
	}

	seq += 'u';
	return seq;
};

test('kitty protocol - simple character', (t: TestContext) => {
	// 'a' key
	const result = parseKeypress(kittyKey(97));
	t.assert.strictEqual(result.name, 'a');
	t.assert.strictEqual(result.ctrl, false);
	t.assert.strictEqual(result.shift, false);
	t.assert.strictEqual(result.meta, false);
	t.assert.strictEqual(result.eventType, 'press');
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - uppercase character (shift)', (t: TestContext) => {
	// 'A' with shift (modifier 2 = shift + 1)
	const result = parseKeypress(kittyKey(97, 2));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.shift);
	t.assert.strictEqual(result.ctrl, false);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - ctrl modifier', (t: TestContext) => {
	// 'a' with ctrl (modifier 5 = ctrl(4) + 1)
	const result = parseKeypress(kittyKey(97, 5));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.ctrl);
	t.assert.strictEqual(result.shift, false);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - alt/option modifier', (t: TestContext) => {
	// 'a' with alt (modifier 3 = alt(2) + 1)
	const result = parseKeypress(kittyKey(97, 3));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.meta);
	t.assert.strictEqual(result.ctrl, false);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - super modifier', (t: TestContext) => {
	// 'a' with super (modifier 9 = super(8) + 1)
	const result = parseKeypress(kittyKey(97, 9));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.super);
	t.assert.strictEqual(result.ctrl, false);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - hyper modifier', (t: TestContext) => {
	// 'a' with hyper (modifier 17 = hyper(16) + 1)
	const result = parseKeypress(kittyKey(97, 17));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.hyper);
	t.assert.strictEqual(result.super, false);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - meta modifier', (t: TestContext) => {
	// 'a' with meta (modifier 33 = meta(32) + 1)
	const result = parseKeypress(kittyKey(97, 33));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.meta);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - caps lock', (t: TestContext) => {
	// 'a' with capsLock (modifier 65 = capsLock(64) + 1)
	const result = parseKeypress(kittyKey(97, 65));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.capsLock);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - num lock', (t: TestContext) => {
	// 'a' with numLock (modifier 129 = numLock(128) + 1)
	const result = parseKeypress(kittyKey(97, 129));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.numLock);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - combined modifiers (ctrl+shift)', (t: TestContext) => {
	// 'a' with ctrl+shift (modifier 6 = ctrl(4) + shift(1) + 1)
	const result = parseKeypress(kittyKey(97, 6));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.ctrl);
	t.assert.ok(result.shift);
	t.assert.strictEqual(result.meta, false);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - combined modifiers (super+ctrl)', (t: TestContext) => {
	// 's' with super+ctrl (modifier 13 = super(8) + ctrl(4) + 1)
	const result = parseKeypress(kittyKey(115, 13));
	t.assert.strictEqual(result.name, 's');
	t.assert.ok(result.super);
	t.assert.ok(result.ctrl);
	t.assert.strictEqual(result.shift, false);
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - escape key', (t: TestContext) => {
	// Escape key
	const result = parseKeypress(kittyKey(27));
	t.assert.strictEqual(result.name, 'escape');
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - return/enter key', (t: TestContext) => {
	// Return/enter key
	const result = parseKeypress(kittyKey(13));
	t.assert.strictEqual(result.name, 'return');
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - tab key', (t: TestContext) => {
	// Tab key
	const result = parseKeypress(kittyKey(9));
	t.assert.strictEqual(result.name, 'tab');
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - backspace release', (t: TestContext) => {
	// Backspace key release
	const result = parseKeypress(kittyKey(127, 1, 3));
	t.assert.strictEqual(result.name, 'backspace');
	t.assert.strictEqual(result.eventType, 'release');
});

test('kitty protocol - backspace key (codepoint 127)', (t: TestContext) => {
	// Backspace key (0x7F)
	const result = parseKeypress(kittyKey(127));
	t.assert.strictEqual(result.name, 'backspace');
	t.assert.strictEqual(result.eventType, 'press');
});

test('legacy parser - meta + backspace (0x7F)', (t: TestContext) => {
	const result = parseKeypress('\u{1B}\u{7F}');
	t.assert.strictEqual(result.name, 'backspace');
	t.assert.ok(result.meta);
});

test('kitty protocol - space key', (t: TestContext) => {
	// Space key
	const result = parseKeypress(kittyKey(32));
	t.assert.strictEqual(result.name, 'space');
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - event type press', (t: TestContext) => {
	// 'a' press event
	const result = parseKeypress(kittyKey(97, 1, 1));
	t.assert.strictEqual(result.name, 'a');
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - event type repeat', (t: TestContext) => {
	// 'a' repeat event
	const result = parseKeypress(kittyKey(97, 1, 2));
	t.assert.strictEqual(result.name, 'a');
	t.assert.strictEqual(result.eventType, 'repeat');
});

test('kitty protocol - event type release', (t: TestContext) => {
	// 'a' release event
	const result = parseKeypress(kittyKey(97, 1, 3));
	t.assert.strictEqual(result.name, 'a');
	t.assert.strictEqual(result.eventType, 'release');
});

test('kitty protocol - number keys', (t: TestContext) => {
	// '1' key
	const result = parseKeypress(kittyKey(49));
	t.assert.strictEqual(result.name, '1');
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - special character', (t: TestContext) => {
	// '@' key
	const result = parseKeypress(kittyKey(64));
	t.assert.strictEqual(result.name, '@');
	t.assert.strictEqual(result.eventType, 'press');
});

test('kitty protocol - Ctrl letters retain their unshifted key code', (t: TestContext) => {
	// Ctrl+a uses the unshifted letter codepoint and modifier 5.
	const result = parseKeypress(kittyKey(97, 5));
	t.assert.strictEqual(result.name, 'a');
	t.assert.ok(result.ctrl);
});

test('kitty protocol - preserves sequence and raw', (t: TestContext) => {
	const seq = kittyKey(97, 5);
	const result = parseKeypress(seq);
	t.assert.strictEqual(result.sequence, seq);
	t.assert.strictEqual(result.raw, seq);
});

test('kitty protocol - text-as-codepoints field', (t: TestContext) => {
	// 'a' key with text-as-codepoints containing 'A' (shifted)
	const result = parseKeypress(kittyKey(97, 2, 1, [65]));
	t.assert.strictEqual(result.name, 'a');
	t.assert.strictEqual(result.text, 'A');
	t.assert.ok(result.shift);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - text-as-codepoints with multiple codepoints', (t: TestContext) => {
	// Key with text containing multiple codepoints (e.g., composed character)
	const result = parseKeypress(kittyKey(97, 1, 1, [72, 101]));
	t.assert.strictEqual(result.text, 'He');
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - supplementary unicode codepoint', (t: TestContext) => {
	// Emoji: 😀 (U+1F600 = 128512)
	const result = parseKeypress(kittyKey(128_512));
	t.assert.strictEqual(result.name, '😀');
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - text-as-codepoints with supplementary unicode', (t: TestContext) => {
	// Text field with emoji codepoint
	const result = parseKeypress(kittyKey(97, 1, 1, [128_512]));
	t.assert.strictEqual(result.text, '😀');
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - text defaults to character from codepoint', (t: TestContext) => {
	const result = parseKeypress(kittyKey(97));
	t.assert.strictEqual(result.text, 'a');
	t.assert.ok(result.isKittyProtocol);
});

// --- Kitty-enhanced special key tests ---

test('kitty protocol - arrow keys with event type', (t: TestContext) => {
	// Up arrow press: CSI 1;1:1 A
	const up = parseKeypress('\u{1B}[1;1:1A');
	t.assert.strictEqual(up.name, 'up');
	t.assert.strictEqual(up.eventType, 'press');
	t.assert.ok(up.isKittyProtocol);

	// Down arrow release: CSI 1;1:3 B
	const down = parseKeypress('\u{1B}[1;1:3B');
	t.assert.strictEqual(down.name, 'down');
	t.assert.strictEqual(down.eventType, 'release');
	t.assert.ok(down.isKittyProtocol);

	// Right arrow repeat: CSI 1;1:2 C
	const right = parseKeypress('\u{1B}[1;1:2C');
	t.assert.strictEqual(right.name, 'right');
	t.assert.strictEqual(right.eventType, 'repeat');
	t.assert.ok(right.isKittyProtocol);

	// Left arrow: CSI 1;1:1 D
	const left = parseKeypress('\u{1B}[1;1:1D');
	t.assert.strictEqual(left.name, 'left');
	t.assert.strictEqual(left.eventType, 'press');
	t.assert.ok(left.isKittyProtocol);
});

test('kitty protocol - arrow keys with modifiers', (t: TestContext) => {
	// Ctrl+up: CSI 1;5:1 A (modifiers=5 means ctrl(4)+1)
	const result = parseKeypress('\u{1B}[1;5:1A');
	t.assert.strictEqual(result.name, 'up');
	t.assert.ok(result.ctrl);
	t.assert.strictEqual(result.eventType, 'press');
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - home and end keys', (t: TestContext) => {
	const home = parseKeypress('\u{1B}[1;1:1H');
	t.assert.strictEqual(home.name, 'home');
	t.assert.strictEqual(home.eventType, 'press');
	t.assert.ok(home.isKittyProtocol);

	const end = parseKeypress('\u{1B}[1;1:1F');
	t.assert.strictEqual(end.name, 'end');
	t.assert.strictEqual(end.eventType, 'press');
	t.assert.ok(end.isKittyProtocol);
});

test('kitty protocol - tilde-terminated special keys', (t: TestContext) => {
	// Delete: CSI 3;1:1 ~
	const del = parseKeypress('\u{1B}[3;1:1~');
	t.assert.strictEqual(del.name, 'delete');
	t.assert.strictEqual(del.eventType, 'press');
	t.assert.ok(del.isKittyProtocol);

	// Insert: CSI 2;1:1 ~
	const ins = parseKeypress('\u{1B}[2;1:1~');
	t.assert.strictEqual(ins.name, 'insert');
	t.assert.ok(ins.isKittyProtocol);

	// Page up: CSI 5;1:1 ~
	const pgup = parseKeypress('\u{1B}[5;1:1~');
	t.assert.strictEqual(pgup.name, 'pageup');
	t.assert.ok(pgup.isKittyProtocol);

	// F5: CSI 15;1:1 ~
	const f5 = parseKeypress('\u{1B}[15;1:1~');
	t.assert.strictEqual(f5.name, 'f5');
	t.assert.ok(f5.isKittyProtocol);
});

test('kitty protocol - tilde keys with modifiers', (t: TestContext) => {
	// Shift+Delete: CSI 3;2:1 ~ (modifiers=2 means shift(1)+1)
	const result = parseKeypress('\u{1B}[3;2:1~');
	t.assert.strictEqual(result.name, 'delete');
	t.assert.ok(result.shift);
	t.assert.strictEqual(result.eventType, 'press');
	t.assert.ok(result.isKittyProtocol);
});

// --- Malformed input handling ---

test('kitty protocol - invalid codepoint above U+10FFFF returns safe empty keypress', (t: TestContext) => {
	// Codepoint 1114112 = 0x110000, one above max Unicode
	const result = parseKeypress('\u{1B}[1114112u');
	t.assert.strictEqual(result.name, '');
	t.assert.strictEqual(result.ctrl, false);
	t.assert.ok(result.isKittyProtocol);
	t.assert.strictEqual(result.isPrintable, false);
});

test('kitty protocol - surrogate codepoint returns safe empty keypress', (t: TestContext) => {
	// Codepoint 0xD800 is a surrogate
	const result = parseKeypress('\u{1B}[55296u');
	t.assert.strictEqual(result.name, '');
	t.assert.strictEqual(result.ctrl, false);
	t.assert.ok(result.isKittyProtocol);
	t.assert.strictEqual(result.isPrintable, false);
});

test('kitty protocol - invalid text codepoint replaced with fallback', (t: TestContext) => {
	// Valid primary codepoint, but text field has an invalid codepoint
	const result = parseKeypress(kittyKey(97, 1, 1, [1_114_112]));
	t.assert.strictEqual(result.name, 'a');
	t.assert.strictEqual(result.text, '?');
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - malformed modifier 0 does not set all flags', (t: TestContext) => {
	// Malformed sequence with modifier 0 (should clamp to 0, not become -1)
	const result = parseKeypress('\u{1B}[97;0u');
	t.assert.strictEqual(result.name, 'a');
	t.assert.strictEqual(result.ctrl, false);
	t.assert.strictEqual(result.shift, false);
	t.assert.strictEqual(result.meta, false);
	t.assert.strictEqual(result.super ?? false, false);
	t.assert.ok(result.isKittyProtocol);
});

// --- Legacy fallback ---

test('non-kitty sequences fall back to legacy parsing', (t: TestContext) => {
	// Regular escape sequence (not kitty protocol)
	// Up arrow key
	const result = parseKeypress('\u{1B}[A');
	t.assert.strictEqual(result.name, 'up');
	t.assert.strictEqual(result.isKittyProtocol, undefined);
});

test('non-kitty sequences - ctrl+c', (t: TestContext) => {
	// Ctrl+c
	const result = parseKeypress('\u{3}');
	t.assert.strictEqual(result.name, 'c');
	t.assert.ok(result.ctrl);
	t.assert.strictEqual(result.isKittyProtocol, undefined);
});

// --- isPrintable field tests ---

test('kitty protocol - isPrintable is true for regular characters', (t: TestContext) => {
	// 'a' key
	const result = parseKeypress(kittyKey(97));
	t.assert.ok(result.isPrintable);
});

test('kitty protocol - isPrintable is true for digits', (t: TestContext) => {
	// '1' key
	const result = parseKeypress(kittyKey(49));
	t.assert.ok(result.isPrintable);
});

test('kitty protocol - isPrintable is true for symbols', (t: TestContext) => {
	// '@' key
	const result = parseKeypress(kittyKey(64));
	t.assert.ok(result.isPrintable);
});

test('kitty protocol - isPrintable is true for emoji', (t: TestContext) => {
	const result = parseKeypress(kittyKey(128_512));
	t.assert.ok(result.isPrintable);
});

test('kitty protocol - isPrintable is false for escape', (t: TestContext) => {
	const result = parseKeypress(kittyKey(27));
	t.assert.strictEqual(result.isPrintable, false);
});

test('kitty protocol - isPrintable is true for return', (t: TestContext) => {
	const result = parseKeypress(kittyKey(13));
	t.assert.ok(result.isPrintable);
});

test('kitty protocol - isPrintable is false for tab', (t: TestContext) => {
	const result = parseKeypress(kittyKey(9));
	t.assert.strictEqual(result.isPrintable, false);
});

test('kitty protocol - isPrintable is true for space', (t: TestContext) => {
	const result = parseKeypress(kittyKey(32));
	t.assert.ok(result.isPrintable);
});

test('kitty protocol - isPrintable is false for backspace', (t: TestContext) => {
	const result = parseKeypress(kittyKey(127));
	t.assert.strictEqual(result.isPrintable, false);
});

test('kitty protocol - Ctrl letters preserve their input character', (t: TestContext) => {
	// Ctrl+a uses the unshifted letter codepoint.
	const result = parseKeypress(kittyKey(97, 5));
	t.assert.ok(result.isPrintable);
	t.assert.strictEqual(result.text, 'a');
});

test('kitty protocol - isPrintable is false for special keys (arrows)', (t: TestContext) => {
	// Up arrow via kitty enhanced special key format
	const result = parseKeypress('\u{1B}[1;1:1A');
	t.assert.strictEqual(result.isPrintable, false);
});

// --- Non-printable key suppression tests (feedback #3 repros) ---

test('kitty protocol - capslock (57358) is non-printable', (t: TestContext) => {
	// \x1b[57358u -> capslock should have isPrintable=false
	const result = parseKeypress('\u{1B}[57358u');
	t.assert.strictEqual(result.name, 'capslock');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - printscreen (57361) is non-printable', (t: TestContext) => {
	// \x1b[57361u -> printscreen should have isPrintable=false
	const result = parseKeypress('\u{1B}[57361u');
	t.assert.strictEqual(result.name, 'printscreen');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - f13 (57376) is non-printable', (t: TestContext) => {
	// \x1b[57376u -> f13 should have isPrintable=false
	const result = parseKeypress('\u{1B}[57376u');
	t.assert.strictEqual(result.name, 'f13');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - media key (57428 mediaplay) is non-printable', (t: TestContext) => {
	const result = parseKeypress('\u{1B}[57428u');
	t.assert.strictEqual(result.name, 'mediaplay');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - modifier-only key (57441 leftshift) is non-printable', (t: TestContext) => {
	const result = parseKeypress('\u{1B}[57441;2u');
	t.assert.strictEqual(result.name, 'leftshift');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - modifier-only key (57442 leftcontrol) is non-printable', (t: TestContext) => {
	const result = parseKeypress('\u{1B}[57442;5u');
	t.assert.strictEqual(result.name, 'leftcontrol');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - kp keys (57399 kp0) are non-printable', (t: TestContext) => {
	const result = parseKeypress('\u{1B}[57399u');
	t.assert.strictEqual(result.name, 'kp0');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - scrolllock (57359) is non-printable', (t: TestContext) => {
	const result = parseKeypress('\u{1B}[57359u');
	t.assert.strictEqual(result.name, 'scrolllock');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - numlock (57360) is non-printable', (t: TestContext) => {
	const result = parseKeypress('\u{1B}[57360u');
	t.assert.strictEqual(result.name, 'numlock');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - pause (57362) is non-printable', (t: TestContext) => {
	const result = parseKeypress('\u{1B}[57362u');
	t.assert.strictEqual(result.name, 'pause');
	t.assert.strictEqual(result.isPrintable, false);
	t.assert.ok(result.isKittyProtocol);
});

test('kitty protocol - volume keys are non-printable', (t: TestContext) => {
	// Lower volume (57438)
	const lower = parseKeypress('\u{1B}[57438u');
	t.assert.strictEqual(lower.name, 'lowervolume');
	t.assert.strictEqual(lower.isPrintable, false);

	// Raise volume (57439)
	const raise = parseKeypress('\u{1B}[57439u');
	t.assert.strictEqual(raise.name, 'raisevolume');
	t.assert.strictEqual(raise.isPrintable, false);

	// Mute volume (57440)
	const mute = parseKeypress('\u{1B}[57440u');
	t.assert.strictEqual(mute.name, 'mutevolume');
	t.assert.strictEqual(mute.isPrintable, false);
});

// --- Init/cleanup control sequence tests ---

const createFakeStdout = () => {
	const stdout = new EventEmitter() as unknown as NodeJS.WriteStream;
	stdout.columns = 100;
	stdout.isTTY = true;
	const write = spy();
	stdout.write = write;
	return {stdout, write};
};

const createFakeStdin = () => {
	const stdin = new EventEmitter() as unknown as NodeJS.ReadStream;
	stdin.isTTY = true;
	stdin.setRawMode = stub();
	stdin.setEncoding = () => {};
	stdin.read = stub();
	return stdin;
};

const getWrittenStrings = (write: ReturnType<typeof spy>): string[] =>
	(write.args as string[][]).map(args => args[0]!);

test('kitty protocol - writes enable sequence on init when mode is enabled', (t: TestContext) => {
	const {stdout, write} = createFakeStdout();
	const stdin = createFakeStdin();

	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		kittyKeyboard: {mode: 'enabled'},
	});

	// CSI > 1 u (push keyboard mode with disambiguateEscapeCodes flag)
	t.assert.ok(getWrittenStrings(write).includes('\u{1B}[>1u'));

	unmount();
});

test('kitty protocol - writes disable sequence on unmount', (t: TestContext) => {
	const {stdout, write} = createFakeStdout();
	const stdin = createFakeStdin();

	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		kittyKeyboard: {mode: 'enabled'},
	});

	unmount();

	// CSI < u (pop keyboard mode)
	t.assert.ok(getWrittenStrings(write).includes('\u{1B}[<u'));
});

test('kitty protocol - not enabled when stdin is not a TTY', (t: TestContext) => {
	const {stdout, write} = createFakeStdout();
	const stdin = createFakeStdin();
	stdin.isTTY = false;

	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		kittyKeyboard: {mode: 'enabled'},
	});

	t.assert.strictEqual(getWrittenStrings(write).includes('\u{1B}[>1u'), false);

	unmount();
});

test('kitty protocol - not enabled when stdout is not a TTY', (t: TestContext) => {
	const {stdout, write} = createFakeStdout();
	stdout.isTTY = false;
	const stdin = createFakeStdin();

	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		kittyKeyboard: {mode: 'enabled'},
	});

	t.assert.strictEqual(getWrittenStrings(write).includes('\u{1B}[>1u'), false);

	unmount();
});

// --- Auto-detection race condition tests ---

// Use a real Readable so read()/data event ordering matches terminal input.
const createDetectionApp = (onQuery?: (stdin: Readable) => void) => {
	const stdin = Object.assign(new Readable({read() {}}), {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		isTTY: true,
		setRawMode() {},
	});
	const {stdout} = createFakeStdout();
	const writtenStrings: string[] = [];
	const inputs: string[] = [];
	stdout.write = (data: string) => {
		writtenStrings.push(data);
		if (data === '\u{1B}[?u') {
			onQuery?.(stdin);
		}

		return true;
	};

	function Example() {
		useInput(input => {
			inputs.push(input);
		});
		return <Text>Hello</Text>;
	}

	const app = render(<Example />, {
		stdout,
		stdin,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});

	return {stdin, writtenStrings, inputs, unmount: app.unmount};
};

test('kitty protocol - auto detection does not enable protocol after unmount', async (t: TestContext) => {
	const app = createDetectionApp();
	// Unmount before the terminal responds.
	app.unmount();
	// Simulate a late terminal response arriving after unmount.
	app.stdin.push('\u{1B}[?1u');
	await delay(30);
	// The enable sequence should NOT have been written after unmount.
	t.assert.strictEqual(app.writtenStrings.includes('\u{1B}[>1u'), false);
});

test('kitty protocol - auto detection handles synchronous query response', async (t: TestContext) => {
	// Respond synchronously to stdout.write, before App has attached its reader.
	const app = createDetectionApp(stdin => {
		stdin.push('\u{1B}[?1u');
	});
	t.after(() => {
		app.unmount();
	});
	await delay(30);
	t.assert.ok(app.writtenStrings.includes('\u{1B}[>1u'));
	t.assert.deepStrictEqual(app.inputs, []);
});

test('kitty protocol - auto detection handles Uint8Array query response', async (t: TestContext) => {
	const app = createDetectionApp();
	t.after(() => {
		app.unmount();
	});
	// Respond with Uint8Array instead of string.
	app.stdin.push(textEncoder.encode('\u{1B}[?1u'));
	await delay(30);
	t.assert.ok(app.writtenStrings.includes('\u{1B}[>1u'));
	t.assert.deepStrictEqual(app.inputs, []);
});

test('kitty protocol - auto detection preserves split UTF-8 input bytes', async (t: TestContext) => {
	const app = createDetectionApp();
	t.after(() => {
		app.unmount();
	});
	// Emit one UTF-8 emoji split across chunks during detection.
	app.stdin.push(new Uint8Array([0xf0, 0x9f]));
	await delay(1);
	app.stdin.push(new Uint8Array([0x92, 0xa9]));
	await delay(250);
	t.assert.deepStrictEqual(app.inputs, ['💩']);
});

test('kitty protocol - auto detection handles split responses with surrounding input', async (t: TestContext) => {
	const app = createDetectionApp();
	t.after(() => {
		app.unmount();
	});
	app.stdin.push('before\u{1B}[?');
	await delay(1);
	app.stdin.push('0uafter');
	await delay(30);
	t.assert.ok(app.writtenStrings.includes('\u{1B}[>1u'));
	t.assert.deepStrictEqual(app.inputs, ['before', 'after']);
});

test('kitty protocol - auto detection timeout preserves query prefix without digits', async (t: TestContext) => {
	const app = createDetectionApp();
	t.after(() => {
		app.unmount();
	});
	app.stdin.push('\u{1B}[?');
	await delay(250);
	t.assert.strictEqual(app.writtenStrings.includes('\u{1B}[>1u'), false);
	t.assert.deepStrictEqual(app.inputs, ['[?']);
});

test('kitty protocol - auto detection does not treat query response without digits as a response', async (t: TestContext) => {
	const app = createDetectionApp();
	t.after(() => {
		app.unmount();
	});
	app.stdin.push('\u{1B}[?u');
	await delay(250);
	t.assert.strictEqual(app.writtenStrings.includes('\u{1B}[>1u'), false);
	t.assert.deepStrictEqual(app.inputs, []);
});

test('kitty protocol - auto detection does not treat invalid query-like sequence as a response', async (t: TestContext) => {
	const app = createDetectionApp();
	t.after(() => {
		app.unmount();
	});
	app.stdin.push('\u{1B}[?1x');
	await delay(250);
	t.assert.strictEqual(app.writtenStrings.includes('\u{1B}[>1u'), false);
	t.assert.deepStrictEqual(app.inputs, []);
});

// --- Space and return text input tests ---

test('kitty protocol - space key has text field set to space character', (t: TestContext) => {
	const result = parseKeypress(kittyKey(32));
	t.assert.strictEqual(result.text, ' ');
});

test('kitty protocol - return key has text field set to carriage return', (t: TestContext) => {
	const result = parseKeypress(kittyKey(13));
	t.assert.strictEqual(result.text, '\r');
});
