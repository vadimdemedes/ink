import process from 'node:process';
import EventEmitter from 'node:events';
import React from 'react';
import test from 'ava';
import {stub, spy} from 'sinon';
import parseKeypress from '../src/parse-keypress.js';
import {render, Text} from '../src/index.js';

// Helper to create kitty protocol CSI u sequences
const kittyKey = (
	codepoint: number,
	modifiers?: number,
	eventType?: number,
	textCodepoints?: number[],
): string => {
	let seq = `\u001B[${codepoint}`;
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

test('kitty protocol - simple character', t => {
	// 'a' key
	const result = parseKeypress(kittyKey(97));
	t.is(result.name, 'a');
	t.false(result.ctrl);
	t.false(result.shift);
	t.false(result.meta);
	t.is(result.eventType, 'press');
	t.true(result.isKittyProtocol);
});

test('kitty protocol - uppercase character (shift)', t => {
	// 'A' with shift (modifier 2 = shift + 1)
	const result = parseKeypress(kittyKey(65, 2));
	t.is(result.name, 'a');
	t.true(result.shift);
	t.false(result.ctrl);
	t.is(result.eventType, 'press');
});

test('kitty protocol - ctrl modifier', t => {
	// 'a' with ctrl (modifier 5 = ctrl(4) + 1)
	const result = parseKeypress(kittyKey(97, 5));
	t.is(result.name, 'a');
	t.true(result.ctrl);
	t.false(result.shift);
	t.is(result.eventType, 'press');
});

test('kitty protocol - alt/option modifier', t => {
	// 'a' with alt (modifier 3 = alt(2) + 1)
	const result = parseKeypress(kittyKey(97, 3));
	t.is(result.name, 'a');
	t.true(result.option);
	t.false(result.ctrl);
	t.is(result.eventType, 'press');
});

test('kitty protocol - super modifier', t => {
	// 'a' with super (modifier 9 = super(8) + 1)
	const result = parseKeypress(kittyKey(97, 9));
	t.is(result.name, 'a');
	t.true(result.super);
	t.false(result.ctrl);
	t.is(result.eventType, 'press');
});

test('kitty protocol - hyper modifier', t => {
	// 'a' with hyper (modifier 17 = hyper(16) + 1)
	const result = parseKeypress(kittyKey(97, 17));
	t.is(result.name, 'a');
	t.true(result.hyper);
	t.false(result.super);
	t.is(result.eventType, 'press');
});

test('kitty protocol - meta modifier', t => {
	// 'a' with meta (modifier 33 = meta(32) + 1)
	const result = parseKeypress(kittyKey(97, 33));
	t.is(result.name, 'a');
	t.true(result.meta);
	t.is(result.eventType, 'press');
});

test('kitty protocol - caps lock', t => {
	// 'a' with capsLock (modifier 65 = capsLock(64) + 1)
	const result = parseKeypress(kittyKey(97, 65));
	t.is(result.name, 'a');
	t.true(result.capsLock);
	t.is(result.eventType, 'press');
});

test('kitty protocol - num lock', t => {
	// 'a' with numLock (modifier 129 = numLock(128) + 1)
	const result = parseKeypress(kittyKey(97, 129));
	t.is(result.name, 'a');
	t.true(result.numLock);
	t.is(result.eventType, 'press');
});

test('kitty protocol - combined modifiers (ctrl+shift)', t => {
	// 'a' with ctrl+shift (modifier 6 = ctrl(4) + shift(1) + 1)
	const result = parseKeypress(kittyKey(97, 6));
	t.is(result.name, 'a');
	t.true(result.ctrl);
	t.true(result.shift);
	t.false(result.meta);
	t.is(result.eventType, 'press');
});

test('kitty protocol - combined modifiers (super+ctrl)', t => {
	// 's' with super+ctrl (modifier 13 = super(8) + ctrl(4) + 1)
	const result = parseKeypress(kittyKey(115, 13));
	t.is(result.name, 's');
	t.true(result.super);
	t.true(result.ctrl);
	t.false(result.shift);
	t.is(result.eventType, 'press');
});

test('kitty protocol - escape key', t => {
	// Escape key
	const result = parseKeypress(kittyKey(27));
	t.is(result.name, 'escape');
	t.is(result.eventType, 'press');
});

test('kitty protocol - return/enter key', t => {
	// Return/enter key
	const result = parseKeypress(kittyKey(13));
	t.is(result.name, 'return');
	t.is(result.eventType, 'press');
});

test('kitty protocol - tab key', t => {
	// Tab key
	const result = parseKeypress(kittyKey(9));
	t.is(result.name, 'tab');
	t.is(result.eventType, 'press');
});

test('kitty protocol - backspace key', t => {
	// Backspace key
	const result = parseKeypress(kittyKey(8));
	t.is(result.name, 'backspace');
	t.is(result.eventType, 'press');
});

test('kitty protocol - delete key', t => {
	// Delete key
	const result = parseKeypress(kittyKey(127));
	t.is(result.name, 'delete');
	t.is(result.eventType, 'press');
});

test('kitty protocol - space key', t => {
	// Space key
	const result = parseKeypress(kittyKey(32));
	t.is(result.name, 'space');
	t.is(result.eventType, 'press');
});

test('kitty protocol - event type press', t => {
	// 'a' press event
	const result = parseKeypress(kittyKey(97, 1, 1));
	t.is(result.name, 'a');
	t.is(result.eventType, 'press');
});

test('kitty protocol - event type repeat', t => {
	// 'a' repeat event
	const result = parseKeypress(kittyKey(97, 1, 2));
	t.is(result.name, 'a');
	t.is(result.eventType, 'repeat');
});

test('kitty protocol - event type release', t => {
	// 'a' release event
	const result = parseKeypress(kittyKey(97, 1, 3));
	t.is(result.name, 'a');
	t.is(result.eventType, 'release');
});

test('kitty protocol - number keys', t => {
	// '1' key
	const result = parseKeypress(kittyKey(49));
	t.is(result.name, '1');
	t.is(result.eventType, 'press');
});

test('kitty protocol - special character', t => {
	// '@' key
	const result = parseKeypress(kittyKey(64));
	t.is(result.name, '@');
	t.is(result.eventType, 'press');
});

test('kitty protocol - ctrl+letter produces codepoint 1-26', t => {
	// When using ctrl+a, kitty sends codepoint 1 (not 97)
	// Ctrl+a (codepoint 1, modifier 5 = ctrl + 1)
	const result = parseKeypress(kittyKey(1, 5));
	t.is(result.name, 'a');
	t.true(result.ctrl);
});

test('kitty protocol - preserves sequence and raw', t => {
	const seq = kittyKey(97, 5);
	const result = parseKeypress(seq);
	t.is(result.sequence, seq);
	t.is(result.raw, seq);
});

test('kitty protocol - text-as-codepoints field', t => {
	// 'a' key with text-as-codepoints containing 'A' (shifted)
	const result = parseKeypress(kittyKey(97, 2, 1, [65]));
	t.is(result.name, 'a');
	t.is(result.text, 'A');
	t.true(result.shift);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - text-as-codepoints with multiple codepoints', t => {
	// Key with text containing multiple codepoints (e.g., composed character)
	const result = parseKeypress(kittyKey(97, 1, 1, [72, 101]));
	t.is(result.text, 'He');
	t.true(result.isKittyProtocol);
});

test('kitty protocol - supplementary unicode codepoint', t => {
	// Emoji: 😀 (U+1F600 = 128512)
	const result = parseKeypress(kittyKey(128_512));
	t.is(result.name, '😀');
	t.true(result.isKittyProtocol);
});

test('kitty protocol - text-as-codepoints with supplementary unicode', t => {
	// Text field with emoji codepoint
	const result = parseKeypress(kittyKey(97, 1, 1, [128_512]));
	t.is(result.text, '😀');
	t.true(result.isKittyProtocol);
});

test('kitty protocol - text defaults to character from codepoint', t => {
	const result = parseKeypress(kittyKey(97));
	t.is(result.text, 'a');
	t.true(result.isKittyProtocol);
});

// --- Kitty-enhanced special key tests ---

test('kitty protocol - arrow keys with event type', t => {
	// Up arrow press: CSI 1;1:1 A
	const up = parseKeypress('\u001B[1;1:1A');
	t.is(up.name, 'up');
	t.is(up.eventType, 'press');
	t.true(up.isKittyProtocol);

	// Down arrow release: CSI 1;1:3 B
	const down = parseKeypress('\u001B[1;1:3B');
	t.is(down.name, 'down');
	t.is(down.eventType, 'release');
	t.true(down.isKittyProtocol);

	// Right arrow repeat: CSI 1;1:2 C
	const right = parseKeypress('\u001B[1;1:2C');
	t.is(right.name, 'right');
	t.is(right.eventType, 'repeat');
	t.true(right.isKittyProtocol);

	// Left arrow: CSI 1;1:1 D
	const left = parseKeypress('\u001B[1;1:1D');
	t.is(left.name, 'left');
	t.is(left.eventType, 'press');
	t.true(left.isKittyProtocol);
});

test('kitty protocol - arrow keys with modifiers', t => {
	// Ctrl+up: CSI 1;5:1 A (modifiers=5 means ctrl(4)+1)
	const result = parseKeypress('\u001B[1;5:1A');
	t.is(result.name, 'up');
	t.true(result.ctrl);
	t.is(result.eventType, 'press');
	t.true(result.isKittyProtocol);
});

test('kitty protocol - home and end keys', t => {
	const home = parseKeypress('\u001B[1;1:1H');
	t.is(home.name, 'home');
	t.is(home.eventType, 'press');
	t.true(home.isKittyProtocol);

	const end = parseKeypress('\u001B[1;1:1F');
	t.is(end.name, 'end');
	t.is(end.eventType, 'press');
	t.true(end.isKittyProtocol);
});

test('kitty protocol - tilde-terminated special keys', t => {
	// Delete: CSI 3;1:1 ~
	const del = parseKeypress('\u001B[3;1:1~');
	t.is(del.name, 'delete');
	t.is(del.eventType, 'press');
	t.true(del.isKittyProtocol);

	// Insert: CSI 2;1:1 ~
	const ins = parseKeypress('\u001B[2;1:1~');
	t.is(ins.name, 'insert');
	t.true(ins.isKittyProtocol);

	// Page up: CSI 5;1:1 ~
	const pgup = parseKeypress('\u001B[5;1:1~');
	t.is(pgup.name, 'pageup');
	t.true(pgup.isKittyProtocol);

	// F5: CSI 15;1:1 ~
	const f5 = parseKeypress('\u001B[15;1:1~');
	t.is(f5.name, 'f5');
	t.true(f5.isKittyProtocol);
});

test('kitty protocol - tilde keys with modifiers', t => {
	// Shift+Delete: CSI 3;2:1 ~ (modifiers=2 means shift(1)+1)
	const result = parseKeypress('\u001B[3;2:1~');
	t.is(result.name, 'delete');
	t.true(result.shift);
	t.is(result.eventType, 'press');
	t.true(result.isKittyProtocol);
});

// --- Malformed input handling ---

test('kitty protocol - invalid codepoint above U+10FFFF returns safe empty keypress', t => {
	// Codepoint 1114112 = 0x110000, one above max Unicode
	const result = parseKeypress('\u001B[1114112u');
	t.is(result.name, '');
	t.false(result.ctrl);
	t.true(result.isKittyProtocol);
	t.false(result.isPrintable);
});

test('kitty protocol - surrogate codepoint returns safe empty keypress', t => {
	// Codepoint 0xD800 is a surrogate
	const result = parseKeypress('\u001B[55296u');
	t.is(result.name, '');
	t.false(result.ctrl);
	t.true(result.isKittyProtocol);
	t.false(result.isPrintable);
});

test('kitty protocol - invalid text codepoint replaced with fallback', t => {
	// Valid primary codepoint, but text field has an invalid codepoint
	const result = parseKeypress(kittyKey(97, 1, 1, [1_114_112]));
	t.is(result.name, 'a');
	t.is(result.text, '?');
	t.true(result.isKittyProtocol);
});

// --- Legacy fallback ---

test('non-kitty sequences fall back to legacy parsing', t => {
	// Regular escape sequence (not kitty protocol)
	// Up arrow key
	const result = parseKeypress('\u001B[A');
	t.is(result.name, 'up');
	t.is(result.isKittyProtocol, undefined);
});

test('non-kitty sequences - ctrl+c', t => {
	// Ctrl+c
	const result = parseKeypress('\u0003');
	t.is(result.name, 'c');
	t.true(result.ctrl);
	t.is(result.isKittyProtocol, undefined);
});

// --- isPrintable field tests ---

test('kitty protocol - isPrintable is true for regular characters', t => {
	// 'a' key
	const result = parseKeypress(kittyKey(97));
	t.true(result.isPrintable);
});

test('kitty protocol - isPrintable is true for digits', t => {
	// '1' key
	const result = parseKeypress(kittyKey(49));
	t.true(result.isPrintable);
});

test('kitty protocol - isPrintable is true for symbols', t => {
	// '@' key
	const result = parseKeypress(kittyKey(64));
	t.true(result.isPrintable);
});

test('kitty protocol - isPrintable is true for emoji', t => {
	const result = parseKeypress(kittyKey(128_512));
	t.true(result.isPrintable);
});

test('kitty protocol - isPrintable is false for escape', t => {
	const result = parseKeypress(kittyKey(27));
	t.false(result.isPrintable);
});

test('kitty protocol - isPrintable is true for return', t => {
	const result = parseKeypress(kittyKey(13));
	t.true(result.isPrintable);
});

test('kitty protocol - isPrintable is false for tab', t => {
	const result = parseKeypress(kittyKey(9));
	t.false(result.isPrintable);
});

test('kitty protocol - isPrintable is true for space', t => {
	const result = parseKeypress(kittyKey(32));
	t.true(result.isPrintable);
});

test('kitty protocol - isPrintable is false for backspace', t => {
	const result = parseKeypress(kittyKey(8));
	t.false(result.isPrintable);
});

test('kitty protocol - isPrintable is false for ctrl+letter', t => {
	// Ctrl+a (codepoint 1)
	const result = parseKeypress(kittyKey(1, 5));
	t.false(result.isPrintable);
});

test('kitty protocol - isPrintable is false for special keys (arrows)', t => {
	// Up arrow via kitty enhanced special key format
	const result = parseKeypress('\u001B[1;1:1A');
	t.false(result.isPrintable);
});

// --- Non-printable key suppression tests (feedback #3 repros) ---

test('kitty protocol - capslock (57358) is non-printable', t => {
	// \x1b[57358u -> capslock should have isPrintable=false
	const result = parseKeypress('\u001B[57358u');
	t.is(result.name, 'capslock');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - printscreen (57361) is non-printable', t => {
	// \x1b[57361u -> printscreen should have isPrintable=false
	const result = parseKeypress('\u001B[57361u');
	t.is(result.name, 'printscreen');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - f13 (57376) is non-printable', t => {
	// \x1b[57376u -> f13 should have isPrintable=false
	const result = parseKeypress('\u001B[57376u');
	t.is(result.name, 'f13');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - media key (57428 mediaplay) is non-printable', t => {
	const result = parseKeypress('\u001B[57428u');
	t.is(result.name, 'mediaplay');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - modifier-only key (57441 leftshift) is non-printable', t => {
	const result = parseKeypress('\u001B[57441u');
	t.is(result.name, 'leftshift');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - modifier-only key (57442 leftcontrol) is non-printable', t => {
	const result = parseKeypress('\u001B[57442u');
	t.is(result.name, 'leftcontrol');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - kp keys (57399 kp0) are non-printable', t => {
	const result = parseKeypress('\u001B[57399u');
	t.is(result.name, 'kp0');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - scrolllock (57359) is non-printable', t => {
	const result = parseKeypress('\u001B[57359u');
	t.is(result.name, 'scrolllock');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - numlock (57360) is non-printable', t => {
	const result = parseKeypress('\u001B[57360u');
	t.is(result.name, 'numlock');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - pause (57362) is non-printable', t => {
	const result = parseKeypress('\u001B[57362u');
	t.is(result.name, 'pause');
	t.false(result.isPrintable);
	t.true(result.isKittyProtocol);
});

test('kitty protocol - volume keys are non-printable', t => {
	// Lower volume (57438)
	const lower = parseKeypress('\u001B[57438u');
	t.is(lower.name, 'lowervolume');
	t.false(lower.isPrintable);

	// Raise volume (57439)
	const raise = parseKeypress('\u001B[57439u');
	t.is(raise.name, 'raisevolume');
	t.false(raise.isPrintable);

	// Mute volume (57440)
	const mute = parseKeypress('\u001B[57440u');
	t.is(mute.name, 'mutevolume');
	t.false(mute.isPrintable);
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

test.serial(
	'kitty protocol - writes enable sequence on init when mode is enabled',
	t => {
		const {stdout, write} = createFakeStdout();
		const stdin = createFakeStdin();

		const {unmount} = render(<Text>Hello</Text>, {
			stdout,
			stdin,
			kittyKeyboard: {mode: 'enabled'},
		});

		// CSI > 1 u (push keyboard mode with disambiguateEscapeCodes flag)
		t.true(getWrittenStrings(write).includes('\u001B[>1u'));

		unmount();
	},
);

test.serial('kitty protocol - writes disable sequence on unmount', t => {
	const {stdout, write} = createFakeStdout();
	const stdin = createFakeStdin();

	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		kittyKeyboard: {mode: 'enabled'},
	});

	unmount();

	// CSI < u (pop keyboard mode)
	t.true(getWrittenStrings(write).includes('\u001B[<u'));
});

test.serial('kitty protocol - not enabled when stdin is not a TTY', t => {
	const {stdout, write} = createFakeStdout();
	const stdin = createFakeStdin();
	stdin.isTTY = false;

	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		kittyKeyboard: {mode: 'enabled'},
	});

	t.false(getWrittenStrings(write).includes('\u001B[>1u'));

	unmount();
});

test.serial('kitty protocol - not enabled when stdout is not a TTY', t => {
	const {stdout, write} = createFakeStdout();
	stdout.isTTY = false;
	const stdin = createFakeStdin();

	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		kittyKeyboard: {mode: 'enabled'},
	});

	t.false(getWrittenStrings(write).includes('\u001B[>1u'));

	unmount();
});

// --- Auto-detection race condition tests ---

test.serial(
	'kitty protocol - auto detection does not enable protocol after unmount',
	t => {
		const {stdout, write} = createFakeStdout();
		const stdin = createFakeStdin();

		const origKittyId = process.env['KITTY_WINDOW_ID'];
		process.env['KITTY_WINDOW_ID'] = '1';

		const {unmount} = render(<Text>Hello</Text>, {
			stdout,
			stdin,
			kittyKeyboard: {mode: 'auto'},
		});

		// Unmount before the terminal responds
		unmount();

		// Simulate a late terminal response arriving after unmount
		stdin.emit('data', '\u001B[?1u');

		// The enable sequence should NOT have been written after unmount
		const strings = getWrittenStrings(write);
		const enableCount = strings.filter(s => s === '\u001B[>1u').length;
		t.is(enableCount, 0);

		if (origKittyId === undefined) {
			delete process.env['KITTY_WINDOW_ID'];
		} else {
			process.env['KITTY_WINDOW_ID'] = origKittyId;
		}
	},
);

test.serial(
	'kitty protocol - auto detection handles synchronous query response',
	t => {
		const {stdout} = createFakeStdout();
		const stdin = createFakeStdin();
		const writtenStrings: string[] = [];

		// Override stdout.write to synchronously emit the response on stdin
		// when the query sequence is written, simulating a fast terminal
		stdout.write = ((data: string) => {
			writtenStrings.push(data);
			if (data === '\u001B[?u') {
				stdin.emit('data', '\u001B[?1u');
			}

			return true;
		}) as typeof stdout.write;

		const origKittyId = process.env['KITTY_WINDOW_ID'];
		process.env['KITTY_WINDOW_ID'] = '1';

		const {unmount} = render(<Text>Hello</Text>, {
			stdout,
			stdin,
			kittyKeyboard: {mode: 'auto'},
		});

		// The enable sequence should have been written
		t.true(writtenStrings.includes('\u001B[>1u'));

		unmount();

		if (origKittyId === undefined) {
			delete process.env['KITTY_WINDOW_ID'];
		} else {
			process.env['KITTY_WINDOW_ID'] = origKittyId;
		}
	},
);

test.serial(
	'kitty protocol - auto detection handles Uint8Array query response',
	t => {
		const {stdout, write} = createFakeStdout();
		const stdin = createFakeStdin();

		const origKittyId = process.env['KITTY_WINDOW_ID'];
		process.env['KITTY_WINDOW_ID'] = '1';

		const {unmount} = render(<Text>Hello</Text>, {
			stdout,
			stdin,
			kittyKeyboard: {mode: 'auto'},
		});

		// Respond with Uint8Array instead of string
		const response = Buffer.from('\u001B[?1u');
		stdin.emit('data', new Uint8Array(response));

		// The enable sequence should have been written
		const strings = getWrittenStrings(write);
		t.true(strings.includes('\u001B[>1u'));

		unmount();

		if (origKittyId === undefined) {
			delete process.env['KITTY_WINDOW_ID'];
		} else {
			process.env['KITTY_WINDOW_ID'] = origKittyId;
		}
	},
);

// --- Space and return text input tests ---

test('kitty protocol - space key has text field set to space character', t => {
	const result = parseKeypress(kittyKey(32));
	t.is(result.text, ' ');
});

test('kitty protocol - return key has text field set to carriage return', t => {
	const result = parseKeypress(kittyKey(13));
	t.is(result.text, '\r');
});
