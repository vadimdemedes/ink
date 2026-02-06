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

// Cursor positioning tests

const showCursorEscape = '\u001B[?25h';
const hideCursorEscape = '\u001B[?25l';

test('standard rendering - positions cursor after output when cursorPosition is set', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 5, y: 1});
	render('Line 1\nLine 2\nLine 3');

	const written = (stdout.write as any).firstCall.args[0] as string;
	// Output is "Line 1\nLine 2\nLine 3\n" (3 visible lines)
	// Cursor after write is at line 3 (0-indexed), col 0
	// To reach y=1: cursorUp(3 - 1) = cursorUp(2)
	// Then cursorTo(5) and show cursor
	t.true(written.includes('Line 3'));
	t.true(
		written.endsWith(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
		),
	);
});

test('standard rendering - hides cursor before erase when cursor was previously shown', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 0, y: 0});
	render('Hello');
	render.setCursorPosition({x: 0, y: 0});
	render('World');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should start with hide cursor before erasing
	t.true(secondCall.startsWith(hideCursorEscape));
	// Should end with show cursor at position
	t.true(
		secondCall.endsWith(
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(0) + showCursorEscape,
		),
	);
});

test('standard rendering - no cursor positioning when cursorPosition is undefined', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Hello');

	const written = (stdout.write as any).firstCall.args[0] as string;
	t.false(written.includes(showCursorEscape));
});

test('standard rendering - cursor position at second-to-last line emits cursorUp(1)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 3, y: 2});
	render('Line 1\nLine 2\nLine 3');

	const written = (stdout.write as any).firstCall.args[0] as string;
	// Output has 3 visible lines. After write, cursor is at line 3 (past last visible).
	// To reach y=2: cursorUp(3 - 2) = cursorUp(1)
	t.true(
		written.endsWith(
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(3) + showCursorEscape,
		),
	);
});

test('standard rendering - clear() returns cursor to bottom before erasing', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 5, y: 0});
	render('Line 1\nLine 2\nLine 3');

	render.clear();

	const clearCall = (stdout.write as any).secondCall.args[0] as string;
	// Cursor was at y=0, output had 4 lines (3 visible + trailing newline).
	// clear() should: hide cursor, move down to bottom (from y=0 to line 3), then erase
	t.true(clearCall.includes(hideCursorEscape));
	t.true(clearCall.includes(ansiEscapes.cursorDown(3)));
	t.true(clearCall.includes(ansiEscapes.eraseLines(4)));
});

test('incremental rendering - clear() returns cursor to bottom before erasing', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render.setCursorPosition({x: 5, y: 0});
	render('Line 1\nLine 2\nLine 3');

	render.clear();

	const clearCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(clearCall.includes(hideCursorEscape));
	t.true(clearCall.includes(ansiEscapes.cursorDown(3)));
	t.true(clearCall.includes(ansiEscapes.eraseLines(4)));
});

test('standard rendering - clearing cursor position stops cursor positioning', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 0, y: 0});
	render('Hello');

	render.setCursorPosition(undefined);
	render('World');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.false(secondCall.includes(showCursorEscape));
});

test('incremental rendering - positions cursor after surgical updates', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render.setCursorPosition({x: 5, y: 1});
	render('Line 1\nLine 2\nLine 3');

	const written = (stdout.write as any).firstCall.args[0] as string;
	// After incremental write, cursor is at line 3 (past last visible)
	// To reach y=1: cursorUp(3 - 1) = cursorUp(2)
	t.true(
		written.endsWith(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
		),
	);
});

test('incremental rendering - positions cursor after update', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render.setCursorPosition({x: 2, y: 0});
	render('Line 1\nLine 2\nLine 3');
	render.setCursorPosition({x: 2, y: 0});
	render('Line 1\nUpdated\nLine 3');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// After incremental update, cursor is at line 3
	// To reach y=0: cursorUp(3)
	t.true(
		secondCall.endsWith(
			ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(2) + showCursorEscape,
		),
	);
});

test('standard rendering - repositions cursor when only cursor position changes (same output)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 2, y: 0});
	render('Hello');
	t.is((stdout.write as any).callCount, 1);

	// Same output, but cursor moved (simulates space input where output is padded identically)
	render.setCursorPosition({x: 3, y: 0});
	render('Hello');

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should reposition cursor: hide + return to bottom + move to new position + show
	t.true(secondCall.includes(showCursorEscape));
	t.true(secondCall.endsWith(ansiEscapes.cursorTo(3) + showCursorEscape));
});

test('standard rendering - returns to bottom before erase when cursor was positioned', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 0, y: 0});
	render('Line 1\nLine 2\nLine 3');

	render.setCursorPosition({x: 5, y: 0});
	render('Line A\nLine B\nLine C');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should: hide cursor, move down to bottom (from y=0 to line 3), then erase + rewrite
	t.true(secondCall.startsWith(hideCursorEscape));
	t.true(secondCall.includes(ansiEscapes.cursorDown(3)));
	t.true(secondCall.includes('Line A'));
});

test('incremental rendering - repositions cursor when only cursor position changes (same output)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render.setCursorPosition({x: 2, y: 0});
	render('Hello');
	t.is((stdout.write as any).callCount, 1);

	render.setCursorPosition({x: 3, y: 0});
	render('Hello');

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(showCursorEscape));
	t.true(secondCall.endsWith(ansiEscapes.cursorTo(3) + showCursorEscape));
});

test('standard rendering - sync() resets cursor state', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render.setCursorPosition({x: 5, y: 0});
	render('Line 1\nLine 2\nLine 3');

	// sync() simulates clearTerminal path: screen is fully reset
	render.sync('Fresh output');

	// Next render should NOT include hideCursor + cursorDown (return-to-bottom prefix)
	// because sync() should have reset previousCursorPosition and cursorWasShown
	render('Updated output');

	const afterSync = stdout.get();
	t.false(afterSync.includes(hideCursorEscape));
	t.false(afterSync.includes(ansiEscapes.cursorDown(3)));
});

test('incremental rendering - sync() resets cursor state', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render.setCursorPosition({x: 5, y: 0});
	render('Line 1\nLine 2\nLine 3');

	// sync() simulates clearTerminal path
	render.sync('Fresh output');

	render('Updated output');

	const afterSync = stdout.get();
	t.false(afterSync.includes(hideCursorEscape));
	t.false(afterSync.includes(ansiEscapes.cursorDown(3)));
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
