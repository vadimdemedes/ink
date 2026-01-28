import test from 'ava';
import {
	CURSOR_MARKER,
	findAndRemoveMarker,
	calculateCursorMovement,
} from '../src/cursor-marker.js';

// Test CURSOR_MARKER constant
test('CURSOR_MARKER is the expected SGR 999 sequence', t => {
	t.is(CURSOR_MARKER, '\u001B[999m');
});

// Test findAndRemoveMarker - empty text
test('findAndRemoveMarker - empty text returns undefined position', t => {
	const result = findAndRemoveMarker('');
	t.is(result.cleaned, '');
	t.is(result.position, undefined);
});

// Test findAndRemoveMarker - no marker
test('findAndRemoveMarker - no marker returns undefined position', t => {
	const result = findAndRemoveMarker('hello world');
	t.is(result.cleaned, 'hello world');
	t.is(result.position, undefined);
});

// Test findAndRemoveMarker - marker at end of line
test('findAndRemoveMarker - marker at end of single line', t => {
	const result = findAndRemoveMarker(`abc${CURSOR_MARKER}`);
	t.is(result.cleaned, 'abc');
	t.deepEqual(result.position, {row: 0, col: 3});
});

// Test findAndRemoveMarker - marker at start
test('findAndRemoveMarker - marker at start', t => {
	const result = findAndRemoveMarker(`${CURSOR_MARKER}abc`);
	t.is(result.cleaned, 'abc');
	t.deepEqual(result.position, {row: 0, col: 0});
});

// Test findAndRemoveMarker - marker in middle
test('findAndRemoveMarker - marker in middle', t => {
	const result = findAndRemoveMarker(`ab${CURSOR_MARKER}cd`);
	t.is(result.cleaned, 'abcd');
	t.deepEqual(result.position, {row: 0, col: 2});
});

// Test findAndRemoveMarker - CJK characters (double-width)
test('findAndRemoveMarker - CJK characters count as 2 columns', t => {
	const result = findAndRemoveMarker(`日本語${CURSOR_MARKER}`);
	t.is(result.cleaned, '日本語');
	// 3 CJK characters = 6 columns
	t.deepEqual(result.position, {row: 0, col: 6});
});

// Test findAndRemoveMarker - mixed ASCII and CJK
test('findAndRemoveMarker - mixed ASCII and CJK', t => {
	const result = findAndRemoveMarker(`abc日本${CURSOR_MARKER}語`);
	t.is(result.cleaned, 'abc日本語');
	// 3 ASCII (3 cols) + 2 CJK (4 cols) = 7 columns
	t.deepEqual(result.position, {row: 0, col: 7});
});

// Test findAndRemoveMarker - multiple lines, marker on first line
test('findAndRemoveMarker - multiple lines, marker on first line', t => {
	const result = findAndRemoveMarker(`abc${CURSOR_MARKER}def\nghi`);
	t.is(result.cleaned, 'abcdef\nghi');
	t.deepEqual(result.position, {row: 0, col: 3});
});

// Test findAndRemoveMarker - multiple lines, marker on second line
test('findAndRemoveMarker - multiple lines, marker on second line', t => {
	const result = findAndRemoveMarker(`line1\nli${CURSOR_MARKER}ne2`);
	t.is(result.cleaned, 'line1\nline2');
	t.deepEqual(result.position, {row: 1, col: 2});
});

// Test findAndRemoveMarker - marker with ANSI styles (styles before marker)
test('findAndRemoveMarker - ANSI styles before marker are excluded from width', t => {
	// Bold "abc" then marker
	const result = findAndRemoveMarker(`\u001B[1mabc\u001B[0m${CURSOR_MARKER}`);
	// ANSI codes should not count towards column width
	t.is(result.cleaned, '\u001B[1mabc\u001B[0m');
	t.deepEqual(result.position, {row: 0, col: 3});
});

// Test calculateCursorMovement - no movement needed
test('calculateCursorMovement - same position returns empty string', t => {
	const result = calculateCursorMovement(5, 10, 5, 10);
	t.is(result, '');
});

// Test calculateCursorMovement - move up
test('calculateCursorMovement - move up', t => {
	const result = calculateCursorMovement(5, 10, 2, 10);
	t.is(result, '\u001B[3A'); // CUU 3
});

// Test calculateCursorMovement - move down
test('calculateCursorMovement - move down', t => {
	const result = calculateCursorMovement(2, 10, 5, 10);
	t.is(result, '\u001B[3B'); // CUD 3
});

// Test calculateCursorMovement - move left
test('calculateCursorMovement - move left', t => {
	const result = calculateCursorMovement(5, 10, 5, 5);
	t.is(result, '\u001B[5D'); // CUB 5
});

// Test calculateCursorMovement - move right
test('calculateCursorMovement - move right', t => {
	const result = calculateCursorMovement(5, 5, 5, 10);
	t.is(result, '\u001B[5C'); // CUF 5
});

// Test calculateCursorMovement - diagonal movement (up and left)
test('calculateCursorMovement - diagonal up-left', t => {
	const result = calculateCursorMovement(5, 10, 2, 5);
	t.is(result, '\u001B[3A\u001B[5D'); // CUU 3, CUB 5
});

// Test calculateCursorMovement - diagonal movement (down and right)
test('calculateCursorMovement - diagonal down-right', t => {
	const result = calculateCursorMovement(2, 5, 5, 10);
	t.is(result, '\u001B[3B\u001B[5C'); // CUD 3, CUF 5
});
