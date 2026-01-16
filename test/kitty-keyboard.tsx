import test from 'ava';
import {
	parseKittySequence,
	isKittySequence,
	enableKittyProtocol,
	disableKittyProtocol,
	queryKittyProtocol,
	isKittyQueryResponse,
	parseKittyQueryResponse,
	KittyFlags,
	KittyModifiers,
} from '../src/kitty-keyboard.js';

// Test CSI u format parsing
test('parseKittySequence - parses basic letter key', t => {
	const result = parseKittySequence('\x1b[97u');
	t.truthy(result);
	t.is(result?.name, 'a');
	t.is(result?.codepoint, 97);
	t.false(result?.shift);
	t.false(result?.ctrl);
	t.false(result?.alt);
	t.false(result?.super);
	t.is(result?.eventType, 'press');
	t.true(result?.isKittyProtocol);
});

test('parseKittySequence - parses shift+letter', t => {
	// Shift modifier is encoded as 1 + 1 = 2
	const result = parseKittySequence('\x1b[97;2u');
	t.truthy(result);
	t.is(result?.name, 'a');
	t.true(result?.shift);
	t.false(result?.ctrl);
	t.false(result?.alt);
});

test('parseKittySequence - parses ctrl+letter', t => {
	// Ctrl modifier is encoded as 1 + 4 = 5
	const result = parseKittySequence('\x1b[97;5u');
	t.truthy(result);
	t.is(result?.name, 'a');
	t.false(result?.shift);
	t.true(result?.ctrl);
	t.false(result?.alt);
});

test('parseKittySequence - parses alt+letter', t => {
	// Alt modifier is encoded as 1 + 2 = 3
	const result = parseKittySequence('\x1b[97;3u');
	t.truthy(result);
	t.is(result?.name, 'a');
	t.false(result?.shift);
	t.false(result?.ctrl);
	t.true(result?.alt);
});

test('parseKittySequence - parses super+letter', t => {
	// Super modifier is encoded as 1 + 8 = 9
	const result = parseKittySequence('\x1b[97;9u');
	t.truthy(result);
	t.is(result?.name, 'a');
	t.false(result?.shift);
	t.false(result?.ctrl);
	t.false(result?.alt);
	t.true(result?.super);
});

test('parseKittySequence - parses multiple modifiers (ctrl+shift)', t => {
	// Ctrl+Shift is encoded as 1 + 4 + 1 = 6
	const result = parseKittySequence('\x1b[97;6u');
	t.truthy(result);
	t.is(result?.name, 'a');
	t.true(result?.shift);
	t.true(result?.ctrl);
	t.false(result?.alt);
});

test('parseKittySequence - parses Enter key', t => {
	const result = parseKittySequence('\x1b[13u');
	t.truthy(result);
	t.is(result?.name, 'return');
	t.is(result?.codepoint, 13);
});

test('parseKittySequence - parses Shift+Enter', t => {
	const result = parseKittySequence('\x1b[13;2u');
	t.truthy(result);
	t.is(result?.name, 'return');
	t.true(result?.shift);
	t.false(result?.ctrl);
});

test('parseKittySequence - parses Tab key', t => {
	const result = parseKittySequence('\x1b[9u');
	t.truthy(result);
	t.is(result?.name, 'tab');
	t.is(result?.codepoint, 9);
});

test('parseKittySequence - parses Ctrl+Tab (distinguishable from Ctrl+I)', t => {
	const result = parseKittySequence('\x1b[9;5u');
	t.truthy(result);
	t.is(result?.name, 'tab');
	t.true(result?.ctrl);
});

test('parseKittySequence - parses Ctrl+I (distinguishable from Tab)', t => {
	// Ctrl+I sends the 'i' codepoint with ctrl modifier
	const result = parseKittySequence('\x1b[105;5u');
	t.truthy(result);
	t.is(result?.name, 'i');
	t.true(result?.ctrl);
});

test('parseKittySequence - parses Escape key', t => {
	const result = parseKittySequence('\x1b[27u');
	t.truthy(result);
	t.is(result?.name, 'escape');
	t.is(result?.codepoint, 27);
});

test('parseKittySequence - parses Backspace key', t => {
	const result = parseKittySequence('\x1b[127u');
	t.truthy(result);
	t.is(result?.name, 'backspace');
	t.is(result?.codepoint, 127);
});

test('parseKittySequence - parses event types', t => {
	// Press (1) - default
	const press = parseKittySequence('\x1b[97;1:1u');
	t.is(press?.eventType, 'press');

	// Repeat (2)
	const repeat = parseKittySequence('\x1b[97;1:2u');
	t.is(repeat?.eventType, 'repeat');

	// Release (3)
	const release = parseKittySequence('\x1b[97;1:3u');
	t.is(release?.eventType, 'release');
});

// Test CSI ~ format for functional keys
test('parseKittySequence - parses Delete key (CSI ~ format)', t => {
	const result = parseKittySequence('\x1b[3~');
	t.truthy(result);
	t.is(result?.name, 'delete');
});

test('parseKittySequence - parses Shift+Delete (CSI ~ format)', t => {
	const result = parseKittySequence('\x1b[3;2~');
	t.truthy(result);
	t.is(result?.name, 'delete');
	t.true(result?.shift);
});

test('parseKittySequence - parses Page Up (CSI ~ format)', t => {
	const result = parseKittySequence('\x1b[5~');
	t.truthy(result);
	t.is(result?.name, 'pageup');
});

test('parseKittySequence - parses Page Down (CSI ~ format)', t => {
	const result = parseKittySequence('\x1b[6~');
	t.truthy(result);
	t.is(result?.name, 'pagedown');
});

// Test letter-terminated format for arrow keys with modifiers
test('parseKittySequence - parses Shift+Up (letter format)', t => {
	const result = parseKittySequence('\x1b[1;2A');
	t.truthy(result);
	t.is(result?.name, 'up');
	t.true(result?.shift);
});

test('parseKittySequence - parses Ctrl+Right (letter format)', t => {
	const result = parseKittySequence('\x1b[1;5C');
	t.truthy(result);
	t.is(result?.name, 'right');
	t.true(result?.ctrl);
});

test('parseKittySequence - parses Alt+Down (letter format)', t => {
	const result = parseKittySequence('\x1b[1;3B');
	t.truthy(result);
	t.is(result?.name, 'down');
	t.true(result?.alt);
});

// Test isKittySequence
test('isKittySequence - returns true for CSI u format', t => {
	t.true(isKittySequence('\x1b[97u'));
	t.true(isKittySequence('\x1b[97;2u'));
	t.true(isKittySequence('\x1b[13;5u'));
});

test('isKittySequence - returns true for CSI ~ format', t => {
	t.true(isKittySequence('\x1b[3~'));
	t.true(isKittySequence('\x1b[3;2~'));
});

test('isKittySequence - returns true for letter format', t => {
	t.true(isKittySequence('\x1b[1;2A'));
	t.true(isKittySequence('\x1b[1;5C'));
});

test('isKittySequence - returns false for legacy escape sequences', t => {
	t.false(isKittySequence('\x1b[A')); // Legacy up arrow
	t.false(isKittySequence('\x1bm')); // Meta+m
	t.false(isKittySequence('\x03')); // Ctrl+C
});

test('isKittySequence - returns false for regular characters', t => {
	t.false(isKittySequence('a'));
	t.false(isKittySequence('A'));
	t.false(isKittySequence('\r'));
});

// Test protocol enable/disable/query sequences
test('enableKittyProtocol - generates correct sequence with default flags', t => {
	const sequence = enableKittyProtocol();
	t.is(sequence, '\x1b[>1u');
});

test('enableKittyProtocol - generates correct sequence with custom flags', t => {
	const sequence = enableKittyProtocol(
		KittyFlags.disambiguateEscapeCodes | KittyFlags.reportEventTypes,
	);
	t.is(sequence, '\x1b[>3u');
});

test('disableKittyProtocol - generates correct sequence', t => {
	const sequence = disableKittyProtocol();
	t.is(sequence, '\x1b[<u');
});

test('queryKittyProtocol - generates correct sequence', t => {
	const sequence = queryKittyProtocol();
	t.is(sequence, '\x1b[?u');
});

// Test query response parsing
test('isKittyQueryResponse - returns true for valid response', t => {
	t.true(isKittyQueryResponse('\x1b[?1u'));
	t.true(isKittyQueryResponse('\x1b[?0u'));
	t.true(isKittyQueryResponse('\x1b[?31u'));
});

test('isKittyQueryResponse - returns false for invalid response', t => {
	t.false(isKittyQueryResponse('\x1b[1u'));
	t.false(isKittyQueryResponse('\x1b[?u'));
	t.false(isKittyQueryResponse('hello'));
});

test('parseKittyQueryResponse - parses flags correctly', t => {
	t.is(parseKittyQueryResponse('\x1b[?0u'), 0);
	t.is(parseKittyQueryResponse('\x1b[?1u'), 1);
	t.is(parseKittyQueryResponse('\x1b[?31u'), 31);
	t.is(parseKittyQueryResponse('invalid'), null);
});

// Test modifier constants
test('KittyModifiers - has correct values', t => {
	t.is(KittyModifiers.shift, 1);
	t.is(KittyModifiers.alt, 2);
	t.is(KittyModifiers.ctrl, 4);
	t.is(KittyModifiers.super, 8);
	t.is(KittyModifiers.hyper, 16);
	t.is(KittyModifiers.meta, 32);
	t.is(KittyModifiers.capsLock, 64);
	t.is(KittyModifiers.numLock, 128);
});

// Test flag constants
test('KittyFlags - has correct values', t => {
	t.is(KittyFlags.disambiguateEscapeCodes, 1);
	t.is(KittyFlags.reportEventTypes, 2);
	t.is(KittyFlags.reportAlternateKeys, 4);
	t.is(KittyFlags.reportAllKeysAsEscapeCodes, 8);
	t.is(KittyFlags.reportAssociatedText, 16);
});
