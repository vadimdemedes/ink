import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';

test('standard rendering - renders and updates output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Hello\n');
	t.is((stdout.write as any).callCount, 1);
	t.is((stdout.write as any).firstCall.args[0], 'Hello\n');

	render('World\n');
	t.is((stdout.write as any).callCount, 2);
	t.true(
		((stdout.write as any).secondCall.args[0] as string).includes('World'),
	);
});

test('standard rendering - skips identical output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout);

	render('Hello\n');
	render('Hello\n');

	t.is((stdout.write as any).callCount, 1);
});

test('incremental rendering - renders and updates output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Hello\n');
	t.is((stdout.write as any).callCount, 1);
	t.is((stdout.write as any).firstCall.args[0], 'Hello\n');

	render('World\n');
	t.is((stdout.write as any).callCount, 2);
	t.true(
		((stdout.write as any).secondCall.args[0] as string).includes('World'),
	);
});

test('incremental rendering - skips identical output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Hello\n');
	render('Hello\n');

	t.is((stdout.write as any).callCount, 1);
});

test('incremental rendering - surgical updates', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\nUpdated\nLine 3\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.true(secondCall.includes('Updated')); // Only updates changed line
	t.false(secondCall.includes('Line 1')); // Doesn't rewrite unchanged
	t.false(secondCall.includes('Line 3')); // Doesn't rewrite unchanged
});

test('incremental rendering - clears extra lines when output shrinks', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.eraseLines(2))); // Erases 2 extra lines
});

test('incremental rendering - when output grows', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\n');
	render('Line 1\nLine 2\nLine 3\n');

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
		'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\n',
	);
	render(
		'Line 1\nUpdated 2\nLine 3\nUpdated 4\nLine 5\nUpdated 6\nLine 7\nUpdated 8\nLine 9\nUpdated 10\n',
	);

	t.is((stdout.write as any).callCount, 2); // Only 2 writes total (initial + update)
});

test('incremental rendering - shrinking output keeps screen tight', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\nLine 2\n');
	render('Line 1\n');

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

	render('Line 1\nLine 2\nLine 3\n');
	render.clear();
	render('Line 1\n');

	const afterClear = stdout.get();

	t.is(afterClear, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - done() resets before next render', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3\n');
	render.done();
	render('Line 1\n');

	const afterDone = stdout.get();

	t.is(afterDone, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - multiple consecutive clear() calls (should be harmless no-ops)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3\n');
	render.clear();
	render.clear();
	render.clear();

	t.is((stdout.write as any).callCount, 4); // Initial render + 3 clears (each writes eraseLines)

	// Verify state is properly reset after multiple clears
	render('New content\n');
	const afterClears = stdout.get();
	t.is(afterClears, ansiEscapes.eraseLines(0) + 'New content\n'); // Should do a fresh write
});

test('incremental rendering - sync() followed by update (assert incremental path is used)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render.sync('Line 1\nLine 2\nLine 3\n');
	t.is((stdout.write as any).callCount, 0); // The sync() call shouldn't write to stdout

	render('Line 1\nUpdated\nLine 3\n');
	t.is((stdout.write as any).callCount, 1);

	const firstCall = (stdout.write as any).firstCall.args[0] as string;
	t.true(firstCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.true(firstCall.includes('Updated')); // Only updates changed line
	t.false(firstCall.includes('Line 1')); // Doesn't rewrite unchanged
	t.false(firstCall.includes('Line 3')); // Doesn't rewrite unchanged
});

// No-trailing-newline tests (fullscreen mode)

test('incremental rendering - no trailing newline: trailing to no-trailing transition', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('A\nB\n');
	render('A\nB');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Both lines are unchanged, so only cursor movement should occur.
	// The key is that the cursor does NOT overshoot past line B.
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skip unchanged A
	t.false(secondCall.endsWith('\n')); // No trailing newline in output
});

test('incremental rendering - no trailing newline: no-trailing to no-trailing update', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('A\nB');
	render('A\nC');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skip unchanged A
	t.true(secondCall.includes('C')); // Updates B to C
	t.false(secondCall.endsWith('\n')); // No trailing newline
});

test('incremental rendering - no trailing newline: shrink', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('A\nB');
	render('A');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should erase 1 extra line (B), not over-erase A
	// previousVisible=2, visibleCount=1, no trailing newline -> eraseLines(2-1+0) = eraseLines(1)
	t.true(secondCall.includes(ansiEscapes.eraseLines(1)));
	t.false(secondCall.endsWith('\n')); // No trailing newline
});

test('incremental rendering - no trailing newline: grow', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('A');
	render('A\nB\nC');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes('B')); // New line B
	t.true(secondCall.includes('C')); // New line C
	t.false(secondCall.endsWith('\n')); // No trailing newline
});

test('incremental rendering - no trailing newline: unchanged lines do not overshoot cursor', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('A\nB');
	render('A\nB'); // Identical - should be skipped entirely

	t.is((stdout.write as any).callCount, 1); // No second write (identical)

	// Now change only the first line
	render('X\nB');

	const thirdCall = (stdout.write as any).secondCall.args[0] as string;
	// Should write X with newline to advance to B's line, then skip B.
	// The buffer ends with the \n that moves to B's line, but no extra
	// cursorNextLine past B -- the cursor stays on the last visible line.
	t.true(thirdCall.includes('X'));
	// Verify no cursorNextLine appears after B's position (B is unchanged
	// and last, so no cursor movement is emitted for it)
	const lastCursorNextLine = thirdCall.lastIndexOf(ansiEscapes.cursorNextLine);
	t.is(lastCursorNextLine, -1); // No cursorNextLine at all since A is changed (written) not skipped
});

test('incremental rendering - render to empty string (full clear vs early exit)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {incremental: true});

	render('Line 1\nLine 2\nLine 3\n');
	render('\n');

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.is(secondCall, ansiEscapes.eraseLines(4) + '\n'); // Erases all 4 lines + writes single newline

	// Rendering empty string again should be skipped (identical output)
	render('\n');
	t.is((stdout.write as any).callCount, 2); // No additional write
});
