import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';

test('standard rendering - renders and updates output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

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
	const render = logUpdate.create(stdout, {showCursor: true});

	render('Hello\n');
	render('Hello\n');

	t.is((stdout.write as any).callCount, 1);
});

test('incremental rendering - renders and updates output', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Hello\n');
	render('Hello\n');

	t.is((stdout.write as any).callCount, 1);
});

test('incremental rendering - surgical updates', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\nUpdated\nLine 3\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.true(secondCall.includes('Updated')); // Only updates changed line
	t.false(secondCall.includes('Line 1')); // Doesn't rewrite unchanged
	t.false(secondCall.includes('Line 3')); // Doesn't rewrite unchanged
});

test('incremental rendering - same-height update rewinds cursor to top with trailing newline', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\nUpdated\nLine 3\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Output ends with '\n', so split('\n') gives ["Line 1","Line 2","Line 3",""]
	// (length 4). After writing, cursor is on row 3 (the empty row past last
	// visible line). cursorUp must be 3 (= 4 - 1) to reach row 0.
	// Using visibleLineCount - 1 (= 2) would only reach row 1, leaving row 0
	// as a ghost line.
	t.true(secondCall.startsWith(ansiEscapes.cursorUp(3)));
});

test('incremental rendering - clears extra lines when output shrinks', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.eraseLines(2))); // Erases 2 extra lines
});

test('incremental rendering - when output grows', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render.clear();
	render('Line 1\n');

	const afterClear = stdout.get();

	t.is(afterClear, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - done() resets before next render', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render.done();
	render('Line 1\n');

	const afterDone = stdout.get();

	t.is(afterDone, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - multiple consecutive clear() calls (should be harmless no-ops)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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

// Cursor positioning tests

const showCursorEscape = '\u001B[?25h';
const hideCursorEscape = '\u001B[?25l';

const renderingModes = [
	{name: 'standard rendering', incremental: false},
	{name: 'incremental rendering', incremental: true},
] as const;

const createRenderForMode = (incremental: boolean) => {
	const stdout = createStdout();
	const render = incremental
		? logUpdate.create(stdout, {showCursor: true, incremental: true})
		: logUpdate.create(stdout, {showCursor: true});
	return {stdout, render};
};

test('standard rendering - positions cursor after output when cursorPosition is set', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 5, y: 1});
	render('Line 1\nLine 2\nLine 3\n');

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
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 0, y: 0});
	render('Hello\n');
	render.setCursorPosition({x: 0, y: 0});
	render('World\n');

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
	const render = logUpdate.create(stdout, {showCursor: true});

	render('Hello\n');

	const written = (stdout.write as any).firstCall.args[0] as string;
	t.false(written.includes(showCursorEscape));
});

test('standard rendering - cursor position at second-to-last line emits cursorUp(1)', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 3, y: 2});
	render('Line 1\nLine 2\nLine 3\n');

	const written = (stdout.write as any).firstCall.args[0] as string;
	// Output has 3 visible lines. After write, cursor is at line 3 (past last visible).
	// To reach y=2: cursorUp(3 - 2) = cursorUp(1)
	t.true(
		written.endsWith(
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(3) + showCursorEscape,
		),
	);
});

for (const {name, incremental} of renderingModes) {
	test(`${name} - clear() returns cursor to bottom before erasing`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 0});
		render('Line 1\nLine 2\nLine 3\n');

		render.clear();

		const clearCall = (stdout.write as any).secondCall.args[0] as string;
		// Cursor was at y=0, output had 4 lines (3 visible + trailing newline).
		// clear() should: hide cursor, move down to bottom (from y=0 to line 3), then erase
		t.true(clearCall.includes(hideCursorEscape));
		t.true(clearCall.includes(ansiEscapes.cursorDown(3)));
		t.true(clearCall.includes(ansiEscapes.eraseLines(4)));
	});
}

test('standard rendering - clearing cursor position stops cursor positioning', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 0, y: 0});
	render('Hello\n');

	render.setCursorPosition(undefined);
	render('World\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.false(secondCall.includes(showCursorEscape));
});

test('incremental rendering - positions cursor after surgical updates', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render.setCursorPosition({x: 5, y: 1});
	render('Line 1\nLine 2\nLine 3\n');

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render.setCursorPosition({x: 2, y: 0});
	render('Line 1\nLine 2\nLine 3\n');
	render.setCursorPosition({x: 2, y: 0});
	render('Line 1\nUpdated\nLine 3\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// After incremental update, cursor is at line 3
	// To reach y=0: cursorUp(3)
	t.true(
		secondCall.endsWith(
			ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(2) + showCursorEscape,
		),
	);
});

for (const {name, incremental} of renderingModes) {
	test(`${name} - repositions cursor when only cursor position changes (same output)`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 2, y: 0});
		render('Hello\n');
		t.is((stdout.write as any).callCount, 1);

		// Same output, but cursor moved (simulates space input where output is padded identically)
		render.setCursorPosition({x: 3, y: 0});
		render('Hello\n');

		t.is((stdout.write as any).callCount, 2);
		const secondCall = (stdout.write as any).secondCall.args[0] as string;
		// Should reposition cursor: hide + return to bottom + move to new position + show
		t.true(secondCall.includes(showCursorEscape));
		t.true(secondCall.endsWith(ansiEscapes.cursorTo(3) + showCursorEscape));
	});
}

test('standard rendering - returns to bottom before erase when cursor was positioned', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 0, y: 0});
	render('Line 1\nLine 2\nLine 3\n');

	render.setCursorPosition({x: 5, y: 0});
	render('Line A\nLine B\nLine C\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should: hide cursor, move down to bottom (from y=0 to line 3), then erase + rewrite
	t.true(secondCall.startsWith(hideCursorEscape));
	t.true(secondCall.includes(ansiEscapes.cursorDown(3)));
	t.true(secondCall.includes('Line A'));
});

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() resets cursor state`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 0});
		render('Line 1\nLine 2\nLine 3\n');

		// Sync() simulates clearTerminal path: screen is fully reset
		render.sync('Fresh output\n');

		// Next render should NOT include hideCursor + cursorDown (return-to-bottom prefix)
		// because sync() should have reset previousCursorPosition and cursorWasShown
		render('Updated output\n');

		const afterSync = stdout.get();
		t.false(afterSync.includes(hideCursorEscape));
		t.false(afterSync.includes(ansiEscapes.cursorDown(3)));
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() writes cursor suffix when cursor is dirty`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 1});
		render.sync('Line 1\nLine 2\nLine 3\n');

		// Sync() should write cursor suffix to position cursor
		// 3 visible lines, cursor at y=1 → cursorUp(3-1) = cursorUp(2)
		t.is((stdout.write as any).callCount, 1);
		const written = (stdout.write as any).firstCall.args[0] as string;
		t.is(
			written,
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() with cursor sets cursorWasShown for next render`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 1});
		render.sync('Line 1\nLine 2\nLine 3\n');

		// Next render should hide cursor before erasing (cursorWasShown = true from sync)
		render('Updated\n');

		const renderCall = stdout.get();
		t.true(renderCall.startsWith(hideCursorEscape));
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() hides cursor when previous render showed cursor`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 1});
		render('Line 1\nLine 2\nLine 3\n');
		t.is((stdout.write as any).callCount, 1);

		render.sync('Fresh output\n');

		t.is((stdout.write as any).callCount, 2);
		t.is((stdout.write as any).secondCall.args[0] as string, hideCursorEscape);
	});
}

test('standard rendering - sync() without cursor does not write to stream', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.sync('Line 1\nLine 2\nLine 3\n');

	t.is((stdout.write as any).callCount, 0);
});

// No-trailing-newline tests (fullscreen mode)

test('incremental rendering - no trailing newline: trailing to no-trailing transition', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('A\nB');
	render('A\nC');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes(ansiEscapes.cursorNextLine)); // Skip unchanged A
	t.true(secondCall.includes('C')); // Updates B to C
	t.false(secondCall.endsWith('\n')); // No trailing newline
});

test('incremental rendering - no trailing newline: shrink', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('A');
	render('A\nB\nC');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.includes('B')); // New line B
	t.true(secondCall.includes('C')); // New line C
	t.false(secondCall.endsWith('\n')); // No trailing newline
});

test('incremental rendering - no trailing newline: unchanged lines do not overshoot cursor', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

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
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('\n');

	t.is((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.is(secondCall, ansiEscapes.eraseLines(4) + '\n'); // Erases all 4 lines + writes single newline

	// Rendering empty string again should be skipped (identical output)
	render('\n');
	t.is((stdout.write as any).callCount, 2); // No additional write
});

// Viewport clamping tests — cursor-up must never exceed stream.rows

test('standard rendering - clamps eraseLines to viewport height', t => {
	const stdout = createStdout(100, true, 5);
	const render = logUpdate.create(stdout, {showCursor: true});

	// Render 20 lines (far exceeds viewport of 5)
	const lines = Array.from({length: 20}, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
	render(lines);

	// Update to different content
	render('New content\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// eraseLines should be clamped to 5 (viewport), not 21 (actual line count)
	t.true(secondCall.includes(ansiEscapes.eraseLines(5)));
	t.false(secondCall.includes(ansiEscapes.eraseLines(21)));
});

test('standard rendering - clear() clamps eraseLines to viewport height', t => {
	const stdout = createStdout(100, true, 5);
	const render = logUpdate.create(stdout, {showCursor: true});

	const lines = Array.from({length: 20}, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
	render(lines);
	render.clear();

	const clearCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(clearCall.includes(ansiEscapes.eraseLines(5)));
	t.false(clearCall.includes(ansiEscapes.eraseLines(21)));
});

test('incremental rendering - clamps cursorUp to viewport height', t => {
	const stdout = createStdout(100, true, 5);
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	// Render 20 lines
	const lines = Array.from({length: 20}, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
	render(lines);

	// Update one line — triggers incremental path with cursorUp
	const updatedLines = Array.from({length: 20}, (_, i) =>
		i === 10 ? 'Updated' : `Line ${i + 1}`,
	).join('\n') + '\n';
	render(updatedLines);

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// cursorUp should be clamped to viewport - 1 = 4, not 20 (lines.length - 1)
	t.true(secondCall.includes(ansiEscapes.cursorUp(4)));
	t.false(secondCall.includes(ansiEscapes.cursorUp(20)));
});

test('incremental rendering - clear() clamps eraseLines to viewport height', t => {
	const stdout = createStdout(100, true, 5);
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	const lines = Array.from({length: 20}, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
	render(lines);
	render.clear();

	const clearCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(clearCall.includes(ansiEscapes.eraseLines(5)));
	t.false(clearCall.includes(ansiEscapes.eraseLines(21)));
});

test('standard rendering - no clamping when content fits viewport', t => {
	const stdout = createStdout(100, true, 30);
	const render = logUpdate.create(stdout, {showCursor: true});

	// 3 lines fits easily in 30-row viewport
	render('Line 1\nLine 2\nLine 3\n');
	render('Updated\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// eraseLines(4) is fine — under viewport limit of 30
	t.true(secondCall.includes(ansiEscapes.eraseLines(4)));
});

test('incremental rendering - no clamping when content fits viewport', t => {
	const stdout = createStdout(100, true, 30);
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\nUpdated\nLine 3\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// cursorUp(3) is fine — under viewport limit of 30
	t.true(secondCall.includes(ansiEscapes.cursorUp(3)));
});

test('standard rendering - clamps cursorUp in buildCursorSuffix to viewport height', t => {
	const stdout = createStdout(100, true, 5);
	const render = logUpdate.create(stdout, {showCursor: true});

	// Position cursor at line 0 with 20 visible lines → moveUp = 20
	// Should be clamped to viewport height (5)
	render.setCursorPosition({x: 0, y: 0});

	const lines = Array.from({length: 20}, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
	render(lines);

	const firstCall = (stdout.write as any).firstCall.args[0] as string;
	// cursorUp should be clamped to 5 (viewport), not 20 (visibleLineCount - y)
	t.true(firstCall.includes(ansiEscapes.cursorUp(5)));
	t.false(firstCall.includes(ansiEscapes.cursorUp(20)));
});

test('incremental rendering - clamps cursorUp in buildCursorSuffix to viewport height', t => {
	const stdout = createStdout(100, true, 5);
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render.setCursorPosition({x: 0, y: 0});

	const lines = Array.from({length: 20}, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
	render(lines);

	const firstCall = (stdout.write as any).firstCall.args[0] as string;
	t.true(firstCall.includes(ansiEscapes.cursorUp(5)));
	t.false(firstCall.includes(ansiEscapes.cursorUp(20)));
});
