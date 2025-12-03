import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';

test('standard rendering - renders and updates output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Hello');
	t.is((stdout.write as any).callCount, 1);
	t.is((stdout.write as any).firstCall.args[0], 'Hello\n');

	render('World');
	t.is((stdout.write as any).callCount, 2);
	t.true(
		((stdout.write as any).secondCall.args[0] as string).includes('World'),
	);
});

test('standard rendering - skips identical output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Hello');
	render('Hello');

	t.is((stdout.write as any).callCount, 1);
});

test('incremental rendering - renders and updates output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Hello');
	t.is((stdout.write as any).callCount, 1);
	t.is((stdout.write as any).firstCall.args[0], 'Hello\n');

	render('World');
	t.is((stdout.write as any).callCount, 2);
	t.true(
		((stdout.write as any).secondCall.args[0] as string).includes('World'),
	);
});

test('incremental rendering - skips identical output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Hello');
	render('Hello');

	t.is((stdout.write as any).callCount, 1);
});

test('incremental rendering - surgical updates', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3');
	render('Line 1\nUpdated\nLine 3');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.true(secondCall.includes('Updated')); // Only updates changed line
	t.false(secondCall.includes('Line 1')); // Doesn't rewrite unchanged
	t.false(secondCall.includes('Line 3')); // Doesn't rewrite unchanged
});

test('incremental rendering - clears extra lines when output shrinks', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3');
	render('Line 1');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.eraseLines(2))); // Erases 2 extra lines
});

test('incremental rendering - when output grows', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1');
	render('Line 1\nLine 2\nLine 3');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged first line
	t.true(secondCall.includes('Line 2')); // Adds new line
	t.true(secondCall.includes('Line 3')); // Adds new line
	t.false(secondCall.includes('Line 1')); // Doesn't rewrite unchanged
});

test('incremental rendering - single write call with multiple surgical updates', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render(
		'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10',
	);
	render(
		'Line 1\nUpdated 2\nLine 3\nUpdated 4\nLine 5\nUpdated 6\nLine 7\nUpdated 8\nLine 9\nUpdated 10',
	);

	t.is((stdout.write as any).callCount, 2); // Only 2 writes total (initial + update)
});

test('incremental rendering - shrinking output keeps screen tight', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3');
	render('Line 1\nLine 2');
	render('Line 1');

	const thirdCall = stdout.get();

	t.is(
		thirdCall,
		ansiEscapes.eraseLines(2) + // Erase Line 2 and ending cursorNextLine
			ansiEscapes.cursorUp(1) + // Move to beginning of Line 1
			ansiEscapes.cursorNextLine, // Move to next line after Line 1
	);
});

test('incremental rendering - clear() fully resets incremental state', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3');
	render.clear();
	render('Line 1');

	const afterClear = stdout.get();

	t.is(afterClear, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - done() resets before next render', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3');
	render.done();
	render('Line 1');

	const afterDone = stdout.get();

	t.is(afterDone, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - multiple consecutive clear() calls (should be harmless no-ops)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3');
	render.clear();
	render.clear();
	render.clear();

	t.is((stdout.write as any).callCount, 4); // Initial render + 3 clears (each writes eraseLines)

	// Verify state is properly reset after multiple clears
	render('New content');
	const afterClears = stdout.get();
	t.is(afterClears, ansiEscapes.eraseLines(0) + 'New content\n'); // Should do a fresh write
});

test('incremental rendering - sync() followed by update (assert incremental path is used)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render.sync('Line 1\nLine 2\nLine 3');
	t.is((stdout.write as any).callCount, 0); // The sync() call shouldn't write to stdout

	render('Line 1\nUpdated\nLine 3');
	t.is((stdout.write as any).callCount, 1);

	const firstCall = (stdout.write as any).firstCall.args[0] as string;
	t.true(firstCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.true(firstCall.includes('Updated')); // Only updates changed line
	t.false(firstCall.includes('Line 1')); // Doesn't rewrite unchanged
	t.false(firstCall.includes('Line 3')); // Doesn't rewrite unchanged
});

test('incremental rendering - render to empty string (full clear vs early exit)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3');
	render('');

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.is(secondCall, ansiEscapes.eraseLines(4) + '\n'); // Erases all 4 lines + writes single newline

	// Rendering empty string again should be skipped (identical output)
	render('');
	t.is((stdout.write as any).callCount, 2); // No additional write
});

// =============================================================================
// Cursor position tests (enableImeCursor mode)
// =============================================================================

test('standard IME cursor - moves cursor when output is same but cursor changed', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	// First render with cursor at (0, 3)
	render('Hello', {row: 0, col: 3});
	t.is((stdout.write as any).callCount, 1);

	// Same output, different cursor position - should only move cursor
	render('Hello', {row: 0, col: 5});
	t.is((stdout.write as any).callCount, 2);

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should contain cursor movement, not full re-render
	t.true(secondCall.includes(ansiEscapes.cursorForward(2))); // Move right by 2
	t.false(secondCall.includes('Hello')); // Should not re-render text
});

test('standard IME cursor - skips when both output and cursor are same', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Hello', {row: 0, col: 3});
	render('Hello', {row: 0, col: 3}); // Same output and cursor

	t.is((stdout.write as any).callCount, 1); // Only initial render
});

test('standard IME cursor - cursor backward movement', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Hello', {row: 0, col: 5});
	render('Hello', {row: 0, col: 2}); // Move cursor left

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorBackward(3))); // Move left by 3
});

test('standard IME cursor - cursor up movement', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Line1\nLine2', {row: 1, col: 3});
	render('Line1\nLine2', {row: 0, col: 3}); // Move cursor up

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorUp(1))); // Move up by 1
});

test('standard IME cursor - cursor down movement', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Line1\nLine2', {row: 0, col: 3});
	render('Line1\nLine2', {row: 1, col: 3}); // Move cursor down

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorDown(1))); // Move down by 1
});

test('standard IME cursor - diagonal cursor movement', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Line1\nLine2', {row: 0, col: 0});
	render('Line1\nLine2', {row: 1, col: 3}); // Move diagonally

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorForward(3)));
	t.true(secondCall.includes(ansiEscapes.cursorDown(1)));
});

test('standard IME cursor - no cursor provided (undefined)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Hello'); // No cursor position
	t.is((stdout.write as any).callCount, 1);

	render('Hello'); // Same output, still no cursor
	t.is((stdout.write as any).callCount, 1); // Should skip (same output)
});

test('standard IME cursor - cursor at position 0,0', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Hello', {row: 0, col: 0});
	t.is((stdout.write as any).callCount, 1);
	// Should work without errors
	t.pass();
});

test('standard IME cursor - re-render when output changes', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {enableImeCursor: true});

	render('Hello', {row: 0, col: 3});
	render('World', {row: 0, col: 3}); // Different output, same cursor

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes('World')); // Should re-render with new text
});

test('incremental IME cursor - basic cursor positioning', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true, enableImeCursor: true});

	render('Hello', {row: 0, col: 2});
	t.is((stdout.write as any).callCount, 1);

	// Verify output includes cursor positioning
	const firstCall = (stdout.write as any).firstCall.args[0] as string;
	t.true(firstCall.includes('Hello'));
});

test('standard rendering without IME cursor - ignores cursor position', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout); // No enableImeCursor

	render('Hello', {row: 0, col: 3});
	render('Hello', {row: 0, col: 5}); // Different cursor, but should be ignored

	// Without enableImeCursor, same output should be skipped regardless of cursor
	t.is((stdout.write as any).callCount, 1);
});
