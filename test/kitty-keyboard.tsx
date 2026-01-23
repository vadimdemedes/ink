import test from 'ava';
import {
	isKittySequence,
	parseKittySequence,
	decodeModifiers,
	kittyModifiers,
} from '../src/kitty-keyboard.js';

// ============================================================================
// isKittySequence() tests
// ============================================================================

test('isKittySequence - returns true for basic key sequence', t => {
	// ESC[97u = 'a' with no modifiers
	t.true(isKittySequence('\u001B[97u'));
});

test('isKittySequence - returns true for key with modifiers', t => {
	// ESC[97;2u = shift+a
	t.true(isKittySequence('\u001B[97;2u'));
});

test('isKittySequence - returns true for key with modifiers and event type', t => {
	// ESC[97;5:1u = ctrl+a press event
	t.true(isKittySequence('\u001B[97;5:1u'));
});

test('isKittySequence - returns false for empty string', t => {
	t.false(isKittySequence(''));
});

test('isKittySequence - returns false for too short string', t => {
	t.false(isKittySequence('\u001B[u'));
});

test('isKittySequence - returns false for string without CSI prefix', t => {
	t.false(isKittySequence('97u'));
});

test('isKittySequence - returns false for string without u terminator', t => {
	t.false(isKittySequence('\u001B[97'));
});

test('isKittySequence - returns false for legacy arrow key sequence', t => {
	// ESC[A = up arrow (not a Kitty sequence)
	t.false(isKittySequence('\u001B[A'));
});

test('isKittySequence - returns false for random string', t => {
	t.false(isKittySequence('hello world'));
});

test('isKittySequence - returns false for partial CSI sequence', t => {
	t.false(isKittySequence('\u001B['));
});

// ============================================================================
// decodeModifiers() tests
// ============================================================================

test('decodeModifiers - returns no modifiers when bitfield is 1', t => {
	const result = decodeModifiers(1);
	t.deepEqual(result, {
		shift: false,
		alt: false,
		ctrl: false,
		super: false,
	});
});

test('decodeModifiers - decodes shift modifier (bitfield 2)', t => {
	// Shift = 1, so bitfield = 1 + 1 = 2
	const result = decodeModifiers(2);
	t.deepEqual(result, {
		shift: true,
		alt: false,
		ctrl: false,
		super: false,
	});
});

test('decodeModifiers - decodes alt modifier (bitfield 3)', t => {
	// Alt = 2, so bitfield = 2 + 1 = 3
	const result = decodeModifiers(3);
	t.deepEqual(result, {
		shift: false,
		alt: true,
		ctrl: false,
		super: false,
	});
});

test('decodeModifiers - decodes ctrl modifier (bitfield 5)', t => {
	// Ctrl = 4, so bitfield = 4 + 1 = 5
	const result = decodeModifiers(5);
	t.deepEqual(result, {
		shift: false,
		alt: false,
		ctrl: true,
		super: false,
	});
});

test('decodeModifiers - decodes super modifier (bitfield 9)', t => {
	// Super = 8, so bitfield = 8 + 1 = 9
	const result = decodeModifiers(9);
	t.deepEqual(result, {
		shift: false,
		alt: false,
		ctrl: false,
		super: true,
	});
});

test('decodeModifiers - decodes shift+alt (bitfield 4)', t => {
	// Shift + Alt = 1 + 2 = 3, bitfield = 3 + 1 = 4
	const result = decodeModifiers(4);
	t.deepEqual(result, {
		shift: true,
		alt: true,
		ctrl: false,
		super: false,
	});
});

test('decodeModifiers - decodes ctrl+alt (bitfield 7)', t => {
	// Ctrl + Alt = 4 + 2 = 6, bitfield = 6 + 1 = 7
	const result = decodeModifiers(7);
	t.deepEqual(result, {
		shift: false,
		alt: true,
		ctrl: true,
		super: false,
	});
});

test('decodeModifiers - decodes ctrl+shift (bitfield 6)', t => {
	// Ctrl + Shift = 4 + 1 = 5, bitfield = 5 + 1 = 6
	const result = decodeModifiers(6);
	t.deepEqual(result, {
		shift: true,
		alt: false,
		ctrl: true,
		super: false,
	});
});

test('decodeModifiers - decodes all modifiers (bitfield 16)', t => {
	// Shift + Alt + Ctrl + Super = 1 + 2 + 4 + 8 = 15, bitfield = 15 + 1 = 16
	const result = decodeModifiers(16);
	t.deepEqual(result, {
		shift: true,
		alt: true,
		ctrl: true,
		super: true,
	});
});

test('decodeModifiers - decodes super+shift (bitfield 10)', t => {
	// Super + Shift = 8 + 1 = 9, bitfield = 9 + 1 = 10
	const result = decodeModifiers(10);
	t.deepEqual(result, {
		shift: true,
		alt: false,
		ctrl: false,
		super: true,
	});
});

// ============================================================================
// parseKittySequence() tests
// ============================================================================

test('parseKittySequence - parses basic letter a', t => {
	// ESC[97u = 'a' (codepoint 97) with no modifiers
	const result = parseKittySequence('\u001B[97u');
	t.not(result, undefined);
	t.is(result?.codepoint, 97);
	t.deepEqual(result?.modifiers, {
		shift: false,
		alt: false,
		ctrl: false,
		super: false,
	});
	t.is(result?.eventType, 'press');
});

test('parseKittySequence - parses letter with shift modifier', t => {
	// ESC[65;2u = 'A' (codepoint 65) with shift (bitfield 2)
	const result = parseKittySequence('\u001B[65;2u');
	t.not(result, undefined);
	t.is(result?.codepoint, 65);
	t.true(result?.modifiers.shift);
	t.false(result?.modifiers.ctrl);
	t.is(result?.eventType, 'press');
});

test('parseKittySequence - parses shift+enter', t => {
	// ESC[13;2u = enter (codepoint 13) with shift
	const result = parseKittySequence('\u001B[13;2u');
	t.not(result, undefined);
	t.is(result?.codepoint, 13); // Enter/return
	t.true(result?.modifiers.shift);
	t.false(result?.modifiers.ctrl);
});

test('parseKittySequence - parses ctrl+i', t => {
	// ESC[105;5u = 'i' (codepoint 105) with ctrl (bitfield 5)
	const result = parseKittySequence('\u001B[105;5u');
	t.not(result, undefined);
	t.is(result?.codepoint, 105); // 'i'
	t.true(result?.modifiers.ctrl);
	t.false(result?.modifiers.shift);
});

test('parseKittySequence - parses alt+a', t => {
	// ESC[97;3u = 'a' with alt (bitfield 3)
	const result = parseKittySequence('\u001B[97;3u');
	t.not(result, undefined);
	t.is(result?.codepoint, 97);
	t.true(result?.modifiers.alt);
	t.false(result?.modifiers.ctrl);
});

test('parseKittySequence - parses super+a', t => {
	// ESC[97;9u = 'a' with super (bitfield 9)
	const result = parseKittySequence('\u001B[97;9u');
	t.not(result, undefined);
	t.is(result?.codepoint, 97);
	t.true(result?.modifiers.super);
	t.false(result?.modifiers.ctrl);
});

test('parseKittySequence - parses ctrl+alt+a', t => {
	// ESC[97;7u = 'a' with ctrl+alt (bitfield 7 = ctrl(4) + alt(2) + 1)
	const result = parseKittySequence('\u001B[97;7u');
	t.not(result, undefined);
	t.is(result?.codepoint, 97);
	t.true(result?.modifiers.ctrl);
	t.true(result?.modifiers.alt);
	t.false(result?.modifiers.shift);
});

test('parseKittySequence - parses press event type', t => {
	// ESC[97;1:1u = 'a' with no modifiers, press event
	const result = parseKittySequence('\u001B[97;1:1u');
	t.not(result, undefined);
	t.is(result?.eventType, 'press');
});

test('parseKittySequence - parses repeat event type', t => {
	// ESC[97;1:2u = 'a' with no modifiers, repeat event
	const result = parseKittySequence('\u001B[97;1:2u');
	t.not(result, undefined);
	t.is(result?.eventType, 'repeat');
});

test('parseKittySequence - parses release event type', t => {
	// ESC[97;1:3u = 'a' with no modifiers, release event
	const result = parseKittySequence('\u001B[97;1:3u');
	t.not(result, undefined);
	t.is(result?.eventType, 'release');
});

test('parseKittySequence - parses ctrl+a with press event', t => {
	// ESC[97;5:1u = ctrl+a, press event
	const result = parseKittySequence('\u001B[97;5:1u');
	t.not(result, undefined);
	t.is(result?.codepoint, 97);
	t.true(result?.modifiers.ctrl);
	t.is(result?.eventType, 'press');
});

test('parseKittySequence - returns undefined for invalid sequence', t => {
	t.is(parseKittySequence('hello'), undefined);
});

test('parseKittySequence - returns undefined for empty string', t => {
	t.is(parseKittySequence(''), undefined);
});

test('parseKittySequence - returns undefined for legacy escape sequence', t => {
	// ESC[A = up arrow (not a Kitty sequence)
	t.is(parseKittySequence('\u001B[A'), undefined);
});

test('parseKittySequence - parses tab key', t => {
	// ESC[9u = tab (codepoint 9)
	const result = parseKittySequence('\u001B[9u');
	t.not(result, undefined);
	t.is(result?.codepoint, 9); // Tab
});

test('parseKittySequence - parses escape key', t => {
	// ESC[27u = escape (codepoint 27)
	const result = parseKittySequence('\u001B[27u');
	t.not(result, undefined);
	t.is(result?.codepoint, 27); // Escape
});

test('parseKittySequence - parses backspace', t => {
	// ESC[127u = backspace (codepoint 127)
	const result = parseKittySequence('\u001B[127u');
	t.not(result, undefined);
	t.is(result?.codepoint, 127); // Delete/Backspace
});

test('parseKittySequence - parses space with shift', t => {
	// ESC[32;2u = space (codepoint 32) with shift
	const result = parseKittySequence('\u001B[32;2u');
	t.not(result, undefined);
	t.is(result?.codepoint, 32); // Space
	t.true(result?.modifiers.shift);
});

// ============================================================================
// kittyModifiers constant tests
// ============================================================================

test('kittyModifiers - has correct shift value', t => {
	t.is(kittyModifiers.shift, 1);
});

test('kittyModifiers - has correct alt value', t => {
	t.is(kittyModifiers.alt, 2);
});

test('kittyModifiers - has correct ctrl value', t => {
	t.is(kittyModifiers.ctrl, 4);
});

test('kittyModifiers - has correct super value', t => {
	t.is(kittyModifiers.super, 8);
});
