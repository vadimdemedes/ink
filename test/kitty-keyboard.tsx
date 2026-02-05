import test from 'ava';
import parseKeypress from '../src/parse-keypress.js';

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
	const result = parseKeypress(kittyKey(128512));
	t.is(result.name, '😀');
	t.true(result.isKittyProtocol);
});

test('kitty protocol - text-as-codepoints with supplementary unicode', t => {
	// Text field with emoji codepoint
	const result = parseKeypress(kittyKey(97, 1, 1, [128512]));
	t.is(result.text, '😀');
	t.true(result.isKittyProtocol);
});

test('kitty protocol - no text field when not present', t => {
	const result = parseKeypress(kittyKey(97));
	t.is(result.text, undefined);
	t.true(result.isKittyProtocol);
});

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
