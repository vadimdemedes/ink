import test from 'ava';
import parseKeypress from '../src/parse-keypress.js';

// Kitty keyboard protocol unit tests
// Reference: https://sw.kovidgoyal.net/kitty/keyboard-protocol/
//
// Kitty sequence format: CSI number ; modifiers u
// Where CSI = \u001B[, number = Unicode codepoint or functional key code
// Modifiers: value = 1 + (shift?1:0) + (alt?2:0) + (ctrl?4:0) + (super?8:0)

// ==========================================
// Modifier Decoding Tests
// ==========================================

test('kitty modifier decoding: value 1 = no modifiers', t => {
	// Tab (codepoint 9) with modifier value 1 = no modifiers
	const result = parseKeypress('\u001B[9;1u');
	t.is(result.name, 'tab');
	t.false(result.shift);
	t.false(result.meta);
	t.false(result.ctrl);
	t.false(result.option);
});

test('kitty modifier decoding: value 2 = shift', t => {
	// Tab (codepoint 9) with modifier value 2 = shift
	const result = parseKeypress('\u001B[9;2u');
	t.is(result.name, 'tab');
	t.true(result.shift);
	t.false(result.meta);
	t.false(result.ctrl);
	t.false(result.option);
});

test('kitty modifier decoding: value 3 = alt', t => {
	// Tab (codepoint 9) with modifier value 3 = alt (maps to meta)
	const result = parseKeypress('\u001B[9;3u');
	t.is(result.name, 'tab');
	t.false(result.shift);
	t.true(result.meta);
	t.false(result.ctrl);
	t.false(result.option);
});

test('kitty modifier decoding: value 5 = ctrl', t => {
	// Tab (codepoint 9) with modifier value 5 = ctrl
	const result = parseKeypress('\u001B[9;5u');
	t.is(result.name, 'tab');
	t.false(result.shift);
	t.false(result.meta);
	t.true(result.ctrl);
	t.false(result.option);
});

test('kitty modifier decoding: value 6 = ctrl + shift', t => {
	// Tab (codepoint 9) with modifier value 6 = ctrl + shift
	// Value = 1 + 1 (shift) + 4 (ctrl) = 6
	const result = parseKeypress('\u001B[9;6u');
	t.is(result.name, 'tab');
	t.true(result.shift);
	t.false(result.meta);
	t.true(result.ctrl);
	t.false(result.option);
});

test('kitty modifier decoding: combined modifiers (shift + ctrl + alt)', t => {
	// Tab (codepoint 9) with shift + ctrl + alt
	// Value = 1 + 1 (shift) + 2 (alt) + 4 (ctrl) = 8
	const result = parseKeypress('\u001B[9;8u');
	t.is(result.name, 'tab');
	t.true(result.shift);
	// Alt maps to meta
	t.true(result.meta);
	t.true(result.ctrl);
	t.false(result.option);
});

// ==========================================
// Sequence Parsing Tests
// ==========================================

test('kitty sequence parsing: \\u001B[13u = Enter', t => {
	// Enter without explicit modifiers (defaults to no modifiers)
	const result = parseKeypress('\u001B[13u');
	t.is(result.name, 'return');
	t.false(result.shift);
	t.false(result.meta);
	t.false(result.ctrl);
	t.is(result.sequence, '\u001B[13u');
	t.is(result.code, 'kitty:13');
});

test('kitty sequence parsing: \\u001B[13;2u = Shift+Enter', t => {
	// Enter with Shift
	const result = parseKeypress('\u001B[13;2u');
	t.is(result.name, 'return');
	t.true(result.shift);
	t.false(result.meta);
	t.false(result.ctrl);
	t.is(result.sequence, '\u001B[13;2u');
	t.is(result.code, 'kitty:13');
});

test('kitty sequence parsing: \\u001B[9u = Tab', t => {
	// Tab without explicit modifiers
	const result = parseKeypress('\u001B[9u');
	t.is(result.name, 'tab');
	t.false(result.shift);
	t.false(result.meta);
	t.false(result.ctrl);
	t.is(result.sequence, '\u001B[9u');
	t.is(result.code, 'kitty:9');
});

test('kitty sequence parsing: \\u001B[105;5u = Ctrl+i (codepoint 105 = i)', t => {
	// Ctrl+i where 105 is the Unicode codepoint for 'i'
	const result = parseKeypress('\u001B[105;5u');
	t.is(result.name, 'i');
	t.false(result.shift);
	t.false(result.meta);
	t.true(result.ctrl);
	t.is(result.sequence, '\u001B[105;5u');
	t.is(result.code, 'kitty:105');
});

// ==========================================
// Additional Kitty Protocol Tests
// ==========================================

test('kitty sequence: Escape key', t => {
	const result = parseKeypress('\u001B[27u');
	t.is(result.name, 'escape');
	t.false(result.ctrl);
	t.is(result.code, 'kitty:27');
});

test('kitty sequence: Backspace key', t => {
	const result = parseKeypress('\u001B[127u');
	t.is(result.name, 'backspace');
	t.false(result.ctrl);
	t.is(result.code, 'kitty:127');
});

test('kitty sequence: Space key', t => {
	const result = parseKeypress('\u001B[32u');
	t.is(result.name, 'space');
	t.false(result.ctrl);
	t.is(result.code, 'kitty:32');
});

test('kitty sequence: Ctrl+Space', t => {
	const result = parseKeypress('\u001B[32;5u');
	t.is(result.name, 'space');
	t.true(result.ctrl);
	t.is(result.code, 'kitty:32');
});

test('kitty sequence: uppercase letter A (codepoint 65)', t => {
	// Should normalize to lowercase
	const result = parseKeypress('\u001B[65u');
	t.is(result.name, 'a');
	t.is(result.code, 'kitty:65');
});

test('kitty sequence: lowercase letter a (codepoint 97)', t => {
	const result = parseKeypress('\u001B[97u');
	t.is(result.name, 'a');
	t.is(result.code, 'kitty:97');
});

test('kitty sequence: Ctrl+A', t => {
	const result = parseKeypress('\u001B[97;5u');
	t.is(result.name, 'a');
	t.true(result.ctrl);
	t.false(result.shift);
});

test('kitty sequence: Shift+A', t => {
	const result = parseKeypress('\u001B[65;2u');
	t.is(result.name, 'a');
	t.false(result.ctrl);
	t.true(result.shift);
});

test('kitty sequence: number digit (codepoint 48 = 0)', t => {
	const result = parseKeypress('\u001B[48u');
	t.is(result.name, 'number');
	t.is(result.code, 'kitty:48');
});

test('kitty sequence: super modifier maps to option', t => {
	// Tab with super (value = 1 + 8 = 9)
	const result = parseKeypress('\u001B[9;9u');
	t.is(result.name, 'tab');
	t.false(result.shift);
	t.false(result.meta);
	t.false(result.ctrl);
	t.true(result.option);
});

test('kitty sequence: all modifiers combined', t => {
	// Tab with all modifiers: shift + alt + ctrl + super
	// Value = 1 + 1 + 2 + 4 + 8 = 16
	const result = parseKeypress('\u001B[9;16u');
	t.is(result.name, 'tab');
	t.true(result.shift);
	t.true(result.meta);
	t.true(result.ctrl);
	t.true(result.option);
});
