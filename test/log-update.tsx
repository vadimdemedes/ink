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

// Cursor shape tests

const cursorShapeEscapes = [
	{shape: 'blinking-block', escape: '\u001B[1 q'},
	{shape: 'block', escape: '\u001B[2 q'},
	{shape: 'blinking-underline', escape: '\u001B[3 q'},
	{shape: 'underline', escape: '\u001B[4 q'},
	{shape: 'blinking-bar', escape: '\u001B[5 q'},
	{shape: 'bar', escape: '\u001B[6 q'},
] as const;

for (const {name, incremental} of renderingModes) {
	for (const {shape, escape} of cursorShapeEscapes) {
		test(`${name} - emits ${escape.slice(2)} for shape "${shape}"`, t => {
			const {stdout, render} = createRenderForMode(incremental);

			render.setCursorShape(shape);
			render('Hello\n');

			const written = (stdout.write as any).firstCall.args[0] as string;
			t.true(
				written.startsWith(escape),
				`expected output to start with ${JSON.stringify(escape)}, got ${JSON.stringify(written.slice(0, 16))}`,
			);
		});
	}
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - does not re-emit shape when unchanged between renders`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('bar');
		render('Hello\n');

		render.setCursorShape('bar');
		render('World\n');

		const secondCall = (stdout.write as any).secondCall.args[0] as string;
		t.false(
			secondCall.includes('\u001B[6 q'),
			'shape escape should not be re-emitted when shape is unchanged',
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - shape change forces a write even when output is unchanged`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('block');
		render('Hello\n');
		t.is((stdout.write as any).callCount, 1);

		// Same output, but shape changed.
		render.setCursorShape('bar');
		render('Hello\n');

		t.is((stdout.write as any).callCount, 2);
		const secondCall = (stdout.write as any).secondCall.args[0] as string;
		t.is(secondCall, '\u001B[6 q');
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - isCursorDirty is true after setCursorShape`, t => {
		const {render} = createRenderForMode(incremental);

		t.false(render.isCursorDirty());
		render.setCursorShape('bar');
		t.true(render.isCursorDirty());
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - clear() resets shape state so next render re-emits`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('bar');
		render('Hello\n');

		render.clear();

		render.setCursorShape('bar');
		render('Hello\n');

		const lastCall = stdout.get();
		t.true(
			lastCall.startsWith('\u001B[6 q'),
			'shape should be re-emitted after clear()',
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - done() resets shape state so next render re-emits`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('underline');
		render('Hello\n');

		render.done();

		render.setCursorShape('underline');
		render('Hello\n');

		const lastCall = stdout.get();
		t.true(
			lastCall.startsWith('\u001B[4 q'),
			'shape should be re-emitted after done()',
		);
	});
}

test('standard rendering - shape prefix combines with cursor-only update', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorShape('bar');
	render.setCursorPosition({x: 0, y: 0});
	render('Hello\n');

	// Same output, both shape and position change.
	render.setCursorShape('block');
	render.setCursorPosition({x: 2, y: 0});
	render('Hello\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.true(secondCall.startsWith('\u001B[2 q'));
	t.true(secondCall.includes(ansiEscapes.cursorTo(2)));
});

// Done() / sync() / restore-on-exit coverage

const decscusrReset = '\u001B[0 q';
const decscusrBar = '\u001B[6 q';
const decscusrUnderline = '\u001B[4 q';
const decscusrBlinkingBlock = '\u001B[1 q';

const joinedWrites = (stdout: any): string =>
	(stdout.write.args as string[][]).map(args => args[0]!).join('');

const writesAfter = (stdout: any, before: number): string =>
	(stdout.write.args as string[][])
		.slice(before)
		.map(args => args[0]!)
		.join('');

for (const {name, incremental} of renderingModes) {
	test(`${name} - done() emits reset-shape escape when a shape was emitted`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('bar');
		render('Hello\n');

		const before = (stdout.write as any).callCount as number;
		render.done();

		const after = writesAfter(stdout, before);
		t.true(
			after.includes(decscusrReset),
			`done() should write the DECSCUSR reset escape, got ${JSON.stringify(after)}`,
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - done() does not emit reset-shape escape when no shape was ever set`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render('Hello\n');

		const before = (stdout.write as any).callCount as number;
		render.done();

		const after = writesAfter(stdout, before);
		t.false(
			after.includes(decscusrReset),
			'done() should not emit reset escape when setCursorShape was never called',
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - done() emits the reset escape exactly once per session`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('bar');
		render('Hello\n');

		render.done();
		render.done();

		const all = joinedWrites(stdout);
		const occurrences = all.split(decscusrReset).length - 1;
		t.is(occurrences, 1);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() emits the shape escape on the fullscreen path`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('underline');
		render.sync('Hello\n');

		const all = joinedWrites(stdout);
		t.true(
			all.includes(decscusrUnderline),
			`sync() should emit the underline DECSCUSR escape, got ${JSON.stringify(all)}`,
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() does not re-emit the shape when unchanged`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('bar');
		render('Hello\n');

		const before = (stdout.write as any).callCount as number;
		render.setCursorShape('bar');
		render.sync('Updated\n');

		const after = writesAfter(stdout, before);
		t.false(
			after.includes(decscusrBar),
			'sync() should skip the shape escape when shape is unchanged',
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - shape first emitted via sync() still restores on done()`, t => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorShape('bar');
		render.sync('Hello\n');

		const before = (stdout.write as any).callCount as number;
		render.done();

		const after = writesAfter(stdout, before);
		t.true(
			after.includes(decscusrReset),
			'done() should restore even when shape was first emitted via sync()',
		);
	});
}

test('reset escape is the DECSCUSR default-shape sequence, not a hardcoded shape', t => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorShape('bar');
	render('Hello\n');
	render.done();

	const all = joinedWrites(stdout);

	t.true(all.includes(decscusrReset));

	const resetIndex = all.lastIndexOf(decscusrReset);
	const tail = all.slice(resetIndex + decscusrReset.length);
	t.false(
		tail.includes(decscusrBlinkingBlock),
		'no blinking-block hardcode should follow the reset',
	);
});
