import React from 'react';
import test from 'ava';
import {render, Box, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import Output from '../src/output.js';

// =============================================================================
// Output class - cursorFocusInfo tests
// =============================================================================

test('Output.get() returns null cursorPosition when no focus', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Hello', {transformers: []});

	const result = output.get();
	t.is(result.cursorPosition, null);
});

test('Output.get() returns cursor at text end when terminalCursorPosition is undefined', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 0, col: 5});
});

test('Output.get() returns cursor at position 0', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 0,
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 0, col: 0});
});

test('Output.get() returns cursor at middle position', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2,
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 0, col: 2});
});

test('Output.get() clamps cursor position when exceeds text length', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 100, // Way beyond text length
	});

	const result = output.get();
	// Should be clamped to text length (5)
	t.deepEqual(result.cursorPosition, {row: 0, col: 5});
});

test('Output.get() handles empty text with cursor focus', t => {
	const output = new Output({width: 20, height: 5});
	// First write some text to establish content on the row
	// Note: use "Prefix:_" (underscore) to avoid trimEnd removing trailing space
	output.write(0, 2, 'Prefix:_', {transformers: []});
	// Then write empty text with cursor focus at the end of prefix
	output.write(8, 2, '', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 0,
	});

	const result = output.get();
	// Cursor should be at the end of "Prefix:_" (col 8)
	t.deepEqual(result.cursorPosition, {row: 2, col: 8});
});

test('Output.get() handles empty text alone (edge case - cursor clamped)', t => {
	const output = new Output({width: 20, height: 5});
	// Write only empty text with cursor focus (no other content on row)
	// Note: This is an edge case. In practice, empty input fields usually
	// have prefix text on the same row.
	output.write(5, 2, '', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 0,
	});

	const result = output.get();
	// Due to trimEnd() clamping, cursor col becomes 0 when row is empty
	// This is expected behavior as there's nothing rendered at col 5
	t.deepEqual(result.cursorPosition, {row: 2, col: 0});
});

test('Output.get() handles multiline text cursor at first line', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Line1\nLine2\nLine3', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 3, // Position 3 in "Line1"
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 0, col: 3});
});

test('Output.get() handles multiline text cursor at second line', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Line1\nLine2\nLine3', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 8, // "Line1\nLi" = 6 + 2 = 8
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 1, col: 2});
});

test('Output.get() handles multiline text cursor at newline position', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Line1\nLine2', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 5, // At the end of "Line1" before newline
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 0, col: 5});
});

test('Output.get() handles multiline text cursor right after newline', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Line1\nLine2', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 6, // Right after newline, at start of "Line2"
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 1, col: 0});
});

test('Output.get() handles wide characters (Korean)', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, '한글테스트', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2, // After "한글"
	});

	const result = output.get();
	// Korean characters are 2 columns wide each, so "한글" = 4 columns
	t.deepEqual(result.cursorPosition, {row: 0, col: 4});
});

test('Output.get() handles emoji characters', t => {
	const output = new Output({width: 20, height: 5});
	// Note: '😀'.length === 2 in JavaScript (UTF-16 surrogate pair)
	// So terminalCursorPosition=2 means "after the emoji"
	output.write(0, 0, '😀Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2, // After emoji (surrogate pair length)
	});

	const result = output.get();
	// Emoji is 2 columns wide in terminal
	t.deepEqual(result.cursorPosition, {row: 0, col: 2});
});

test('Output.get() handles emoji at middle of string', t => {
	const output = new Output({width: 20, height: 5});
	// "Hi😀Ho" - 'Hi'.length=2, '😀'.length=2, 'Ho'.length=2
	// terminalCursorPosition=4 is after "Hi😀"
	output.write(0, 0, 'Hi😀Ho', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 4, // After "Hi😀"
	});

	const result = output.get();
	// "Hi" = 2 cols, "😀" = 2 cols, total = 4 cols
	t.deepEqual(result.cursorPosition, {row: 0, col: 4});
});

test('Output.get() uses originalText for cursor calculation', t => {
	const output = new Output({width: 20, height: 5});
	// Simulate applyPaddingToText: original "abc" becomes "  abc" (with 2 space indent)
	output.write(0, 0, '  abc', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2, // Position 2 in original "abc"
		originalText: 'abc',
	});

	const result = output.get();
	// Position 2 in "abc" = after "ab", which is col 2 (not affected by padding in text)
	t.deepEqual(result.cursorPosition, {row: 0, col: 2});
});

test('Output.get() handles x offset', t => {
	const output = new Output({width: 20, height: 5});
	output.write(5, 0, 'Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2,
	});

	const result = output.get();
	// x=5 + cursor position 2 = col 7
	t.deepEqual(result.cursorPosition, {row: 0, col: 7});
});

test('Output.get() handles y offset', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 2, 'Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 3,
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 2, col: 3});
});

test('Output.get() handles both x and y offset with multiline', t => {
	const output = new Output({width: 20, height: 5});
	output.write(3, 1, 'Line1\nLine2', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 8, // "Line1\nLi" = 8
	});

	const result = output.get();
	// y=1, lineIndex=1, so row = 1+1 = 2
	// x=3, col in "Line2" = 2, so col = 3+2 = 5
	t.deepEqual(result.cursorPosition, {row: 2, col: 5});
});

test('Output.get() cursor position respects trimEnd', t => {
	const output = new Output({width: 20, height: 5});
	// Write text with trailing spaces that will be trimmed
	output.write(0, 0, 'Hi   ', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 5, // At position 5 (after trailing spaces)
	});

	const result = output.get();
	// After trimEnd, line is "Hi" (length 2), cursor should be clamped
	t.deepEqual(result.cursorPosition, {row: 0, col: 2});
});

test('Output.get() backward compatible - no terminalCursorPosition uses text end', t => {
	const output = new Output({width: 20, height: 5});
	output.write(2, 1, 'Test', {
		transformers: [],
		isTerminalCursorFocused: true,
		// No terminalCursorPosition
	});

	const result = output.get();
	// Should be at the end of text: x=2 + stringWidth("Test")=4 = 6
	t.deepEqual(result.cursorPosition, {row: 1, col: 6});
});

test('Output.get() backward compatible - multiline without terminalCursorPosition', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Line1\nLine2', {
		transformers: [],
		isTerminalCursorFocused: true,
		// No terminalCursorPosition - should go to end of last line
	});

	const result = output.get();
	// Last line is "Line2", lastLineIndex=1, so row=1
	// lastLineIndex !== 0, so col = stringWidth("Line2") = 5
	t.deepEqual(result.cursorPosition, {row: 1, col: 5});
});

// =============================================================================
// Integration tests with Text component
// =============================================================================

test('Text with terminalCursorFocus returns cursor position', t => {
	const stdout = createStdout();
	render(
		<Text terminalCursorFocus>Hello</Text>,
		{stdout, debug: true, enableImeCursor: true},
	);

	// The stdout.write spy captures the raw output, but cursor position
	// is handled internally. We verify by checking the output exists.
	const output = stdout.get();
	t.is(typeof output, 'string');
	t.true(output.includes('Hello'));
});

test('Text with terminalCursorFocus and terminalCursorPosition', t => {
	const stdout = createStdout();
	render(
		<Text terminalCursorFocus terminalCursorPosition={2}>Hello</Text>,
		{stdout, debug: true, enableImeCursor: true},
	);

	const output = stdout.get();
	t.is(typeof output, 'string');
	t.true(output.includes('Hello'));
});

test('Text with undefined children and cursor focus', t => {
	const stdout = createStdout();
	render(
		<Text terminalCursorFocus terminalCursorPosition={0} />,
		{stdout, debug: true, enableImeCursor: true},
	);

	// Should not throw
	t.pass();
});

test('Text with null children and cursor focus', t => {
	const stdout = createStdout();
	render(
		<Text terminalCursorFocus terminalCursorPosition={0}>{null}</Text>,
		{stdout, debug: true, enableImeCursor: true},
	);

	// Should not throw
	t.pass();
});

test('Multiple Text components - only focused one affects cursor', t => {
	const stdout = createStdout();
	render(
		<Box flexDirection="column">
			<Text>Not focused</Text>
			<Text terminalCursorFocus terminalCursorPosition={3}>Focused</Text>
			<Text>Also not focused</Text>
		</Box>,
		{stdout, debug: true, enableImeCursor: true},
	);

	const output = stdout.get();
	t.true(output.includes('Not focused'));
	t.true(output.includes('Focused'));
	t.true(output.includes('Also not focused'));
});

test('Switching focus between Text components', t => {
	const stdout = createStdout();
	const {rerender} = render(
		<Box flexDirection="column">
			<Text terminalCursorFocus terminalCursorPosition={0}>First</Text>
			<Text>Second</Text>
		</Box>,
		{stdout, debug: true, enableImeCursor: true},
	);

	let output = stdout.get();
	t.true(output.includes('First'));

	// Switch focus
	rerender(
		<Box flexDirection="column">
			<Text>First</Text>
			<Text terminalCursorFocus terminalCursorPosition={0}>Second</Text>
		</Box>,
	);

	output = stdout.get();
	t.true(output.includes('Second'));
});

// =============================================================================
// Edge cases
// =============================================================================

test('Output handles negative terminalCursorPosition gracefully', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, 'Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: -5, // Negative value
	});

	const result = output.get();
	// Negative value treated as 0 due to slice behavior
	t.deepEqual(result.cursorPosition, {row: 0, col: 0});
});

test('Output handles very large width/height', t => {
	const output = new Output({width: 1000, height: 1000});
	output.write(500, 500, 'Test', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2,
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 500, col: 502});
});

test('Output handles only newlines', t => {
	const output = new Output({width: 20, height: 5});
	output.write(0, 0, '\n\n\n', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2, // After second newline
	});

	const result = output.get();
	t.deepEqual(result.cursorPosition, {row: 2, col: 0});
});

test('Output handles mixed content with emojis and Korean', t => {
	const output = new Output({width: 30, height: 5});
	// "안녕😀Hello"
	// "안녕".length = 2, "😀".length = 2, "Hello".length = 5
	// terminalCursorPosition=4 means after "안녕😀"
	output.write(0, 0, '안녕😀Hello', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 4, // After "안녕😀" (2 + 2 in string length)
	});

	const result = output.get();
	// 안녕 = 4 cols (2 chars * 2 width), 😀 = 2 cols, total = 6
	t.deepEqual(result.cursorPosition, {row: 0, col: 6});
});

test('Output cursorFocusInfo is replaced by subsequent focused write', t => {
	const output = new Output({width: 20, height: 5});

	// First focused write
	output.write(0, 0, 'First', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 1,
	});

	// Second focused write (should replace)
	output.write(5, 1, 'Second', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 3,
	});

	const result = output.get();
	// Should use the second focus info
	t.deepEqual(result.cursorPosition, {row: 1, col: 8}); // x=5 + 3
});

test('Output non-focused write after focused write preserves cursor', t => {
	const output = new Output({width: 20, height: 5});

	// Focused write
	output.write(0, 0, 'Focused', {
		transformers: [],
		isTerminalCursorFocused: true,
		terminalCursorPosition: 2,
	});

	// Non-focused write
	output.write(0, 1, 'Not focused', {
		transformers: [],
	});

	const result = output.get();
	// Should still use the focused write's cursor
	t.deepEqual(result.cursorPosition, {row: 0, col: 2});
});
