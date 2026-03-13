import test from 'ava';
import parseKeypress from '../src/parse-keypress.js';

// vt220-style Ctrl+F1–F4 (ESC [ 1 ; 5 P/Q/R/S)
test('Ctrl+F1 resolves to name "f1"', t => {
	const key = parseKeypress('\x1b[1;5P');
	t.is(key.name, 'f1');
	t.true(key.ctrl);
	t.false(key.shift);
	t.false(key.meta);
});

test('Ctrl+F2 resolves to name "f2"', t => {
	const key = parseKeypress('\x1b[1;5Q');
	t.is(key.name, 'f2');
	t.true(key.ctrl);
});

test('Ctrl+F3 resolves to name "f3"', t => {
	const key = parseKeypress('\x1b[1;5R');
	t.is(key.name, 'f3');
	t.true(key.ctrl);
});

test('Ctrl+F4 resolves to name "f4"', t => {
	const key = parseKeypress('\x1b[1;5S');
	t.is(key.name, 'f4');
	t.true(key.ctrl);
});

// Unmapped codes fall back to empty string instead of undefined
test('unmapped ctrl sequence returns empty name', t => {
	const key = parseKeypress('\x1b[1;5I');
	t.is(key.name, '');
	t.true(key.ctrl);
});

test('another unmapped ctrl sequence returns empty name', t => {
	const key = parseKeypress('\x1b[1;5X');
	t.is(key.name, '');
	t.true(key.ctrl);
});

// Shift+F1 (modifier 2) uses same [P mapping
test('Shift+F1 resolves to name "f1" with shift', t => {
	const key = parseKeypress('\x1b[1;2P');
	t.is(key.name, 'f1');
	t.true(key.shift);
	t.false(key.ctrl);
});
