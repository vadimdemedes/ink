import test, {type TestContext} from 'node:test';
import ansiEscapes from 'ansi-escapes';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

test('standard rendering - renders and updates output', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render('Hello\n');
	t.assert.strictEqual((stdout.write as any).callCount, 1);
	t.assert.strictEqual((stdout.write as any).firstCall.args[0], 'Hello\n');

	render('World\n');
	t.assert.strictEqual((stdout.write as any).callCount, 2);
	t.assert.ok(
		((stdout.write as any).secondCall.args[0] as string).includes('World'),
	);
});

test('standard rendering - skips identical output', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render('Hello\n');
	render('Hello\n');

	t.assert.strictEqual((stdout.write as any).callCount, 1);
});

test('incremental rendering - renders and updates output', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Hello\n');
	t.assert.strictEqual((stdout.write as any).callCount, 1);
	t.assert.strictEqual((stdout.write as any).firstCall.args[0], 'Hello\n');

	render('World\n');
	t.assert.strictEqual((stdout.write as any).callCount, 2);
	t.assert.ok(
		((stdout.write as any).secondCall.args[0] as string).includes('World'),
	);
});

test('incremental rendering - skips identical output', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Hello\n');
	render('Hello\n');

	t.assert.strictEqual((stdout.write as any).callCount, 1);
});

test('incremental rendering - surgical updates', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\nUpdated\nLine 3\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.ok(secondCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.assert.ok(secondCall.includes('Updated')); // Only updates changed line
	t.assert.strictEqual(secondCall.includes('Line 1'), false); // Doesn't rewrite unchanged
	t.assert.strictEqual(secondCall.includes('Line 3'), false); // Doesn't rewrite unchanged
});

test('incremental rendering - same-height update rewinds cursor to top with trailing newline', (t: TestContext) => {
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
	t.assert.ok(secondCall.startsWith(ansiEscapes.cursorUp(3)));
});

test('incremental rendering - clears extra lines when output shrinks', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.ok(secondCall.includes(ansiEscapes.eraseLines(2))); // Erases 2 extra lines
});

test('incremental rendering - when output grows', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\n');
	render('Line 1\nLine 2\nLine 3\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.ok(secondCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged first line
	t.assert.ok(secondCall.includes('Line 2')); // Adds new line
	t.assert.ok(secondCall.includes('Line 3')); // Adds new line
	t.assert.strictEqual(secondCall.includes('Line 1'), false); // Doesn't rewrite unchanged
});

test('incremental rendering - single write call with multiple surgical updates', (t: TestContext) => {
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

	t.assert.strictEqual((stdout.write as any).callCount, 2); // Only 2 writes total (initial + update)
});

test('incremental rendering - shrinking output keeps screen tight', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('Line 1\nLine 2\n');
	render('Line 1\n');

	const thirdCall = stdout.get();

	t.assert.strictEqual(
		thirdCall,
		ansiEscapes.eraseLines(2) + // Erase Line 2 and ending cursorNextLine
			ansiEscapes.cursorUp(1) + // Move to beginning of Line 1
			ansiEscapes.cursorNextLine, // Move to next line after Line 1
	);
});

test('incremental rendering - clear() fully resets incremental state', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render.clear();
	render('Line 1\n');

	const afterClear = stdout.get();

	t.assert.strictEqual(afterClear, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - done() resets before next render', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render.done();
	render('Line 1\n');

	const afterDone = stdout.get();

	t.assert.strictEqual(afterDone, ansiEscapes.eraseLines(0) + 'Line 1\n'); // Should do a fresh write
});

test('incremental rendering - multiple consecutive clear() calls (should be harmless no-ops)', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render.clear();
	render.clear();
	render.clear();

	t.assert.strictEqual((stdout.write as any).callCount, 4); // Initial render + 3 clears (each writes eraseLines)

	// Verify state is properly reset after multiple clears
	render('New content\n');
	const afterClears = stdout.get();
	t.assert.strictEqual(
		afterClears,
		ansiEscapes.eraseLines(0) + 'New content\n',
	); // Should do a fresh write
});

test('incremental rendering - sync() followed by update (assert incremental path is used)', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render.sync('Line 1\nLine 2\nLine 3\n');
	t.assert.strictEqual((stdout.write as any).callCount, 0); // The sync() call shouldn't write to stdout

	render('Line 1\nUpdated\nLine 3\n');
	t.assert.strictEqual((stdout.write as any).callCount, 1);

	const firstCall = (stdout.write as any).firstCall.args[0] as string;
	t.assert.ok(firstCall.includes(ansiEscapes.cursorNextLine)); // Skips unchanged lines
	t.assert.ok(firstCall.includes('Updated')); // Only updates changed line
	t.assert.strictEqual(firstCall.includes('Line 1'), false); // Doesn't rewrite unchanged
	t.assert.strictEqual(firstCall.includes('Line 3'), false); // Doesn't rewrite unchanged
});

// Cursor positioning tests

const showCursorEscape = '\u{1B}[?25h';
const hideCursorEscape = '\u{1B}[?25l';

const renderingModes = [
	{name: 'standard rendering', incremental: false},
	{name: 'incremental rendering', incremental: true},
] as const;

const createRenderForMode = (isIncremental: boolean) => {
	const stdout = createStdout();
	const render = isIncremental
		? logUpdate.create(stdout, {showCursor: true, incremental: true})
		: logUpdate.create(stdout, {showCursor: true});
	return {stdout, render};
};

test('standard rendering - positions cursor after output when cursorPosition is set', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 5, y: 1});
	render('Line 1\nLine 2\nLine 3\n');

	const written = (stdout.write as any).firstCall.args[0] as string;
	// Output is "Line 1\nLine 2\nLine 3\n" (3 visible lines)
	// Cursor after write is at line 3 (0-indexed), col 0
	// To reach y=1: cursorUp(3 - 1) = cursorUp(2)
	// Then cursorTo(5) and show cursor
	t.assert.ok(written.includes('Line 3'));
	t.assert.ok(
		written.endsWith(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
		),
	);
});

test('standard rendering - hides cursor before erase when cursor was previously shown', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 0, y: 0});
	render('Hello\n');
	render.setCursorPosition({x: 0, y: 0});
	render('World\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should start with hide cursor before erasing
	t.assert.ok(secondCall.startsWith(hideCursorEscape));
	// Should end with show cursor at position
	t.assert.ok(
		secondCall.endsWith(
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(0) + showCursorEscape,
		),
	);
});

test('standard rendering - no cursor positioning when cursorPosition is undefined', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render('Hello\n');

	const written = (stdout.write as any).firstCall.args[0] as string;
	t.assert.strictEqual(written.includes(showCursorEscape), false);
});

test('standard rendering - cursor position at second-to-last line emits cursorUp(1)', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 3, y: 2});
	render('Line 1\nLine 2\nLine 3\n');

	const written = (stdout.write as any).firstCall.args[0] as string;
	// Output has 3 visible lines. After write, cursor is at line 3 (past last visible).
	// To reach y=2: cursorUp(3 - 2) = cursorUp(1)
	t.assert.ok(
		written.endsWith(
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(3) + showCursorEscape,
		),
	);
});

for (const {name, incremental} of renderingModes) {
	for (const y of [0, 5]) {
		test(`${name} - clear() erases the frame with the cursor at row ${y}`, (t: TestContext) => {
			const {stdout, render} = createRenderForMode(incremental);

			render.setCursorPosition({x: 5, y});
			render('Line 1\nLine 2\nLine 3\n');
			render.clear();

			const writes = ((stdout.write as any).args as string[][]).map(args =>
				args[0]!.replaceAll('\n', '\r\n'),
			);
			t.assert.ok(writes[1]!.startsWith(hideCursorEscape));
			t.assert.deepStrictEqual(
				reconstructTerminalLines(['shell\r\n', ...writes], 10).filter(Boolean),
				['shell'],
			);
		});
	}
}

test('standard rendering - clearing cursor position stops cursor positioning', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 0, y: 0});
	render('Hello\n');

	render.setCursorPosition(undefined);
	render('World\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.strictEqual(secondCall.includes(showCursorEscape), false);
});

test('incremental rendering - positions cursor after surgical updates', (t: TestContext) => {
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
	t.assert.ok(
		written.endsWith(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
		),
	);
});

test('incremental rendering - positions cursor after update', (t: TestContext) => {
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
	t.assert.ok(
		secondCall.endsWith(
			ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(2) + showCursorEscape,
		),
	);
});

for (const {name, incremental} of renderingModes) {
	test(`${name} - repositions cursor when only cursor position changes (same output)`, (t: TestContext) => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 2, y: 0});
		render('Hello\n');
		t.assert.strictEqual((stdout.write as any).callCount, 1);

		// Same output, but cursor moved (simulates space input where output is padded identically)
		render.setCursorPosition({x: 3, y: 0});
		render('Hello\n');

		t.assert.strictEqual((stdout.write as any).callCount, 2);
		const secondCall = (stdout.write as any).secondCall.args[0] as string;
		// Should reposition cursor: hide + return to bottom + move to new position + show
		t.assert.ok(secondCall.includes(showCursorEscape));
		t.assert.ok(
			secondCall.endsWith(ansiEscapes.cursorTo(3) + showCursorEscape),
		);
	});
}

test('standard rendering - returns to bottom before erase when cursor was positioned', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 0, y: 0});
	render('Line 1\nLine 2\nLine 3\n');

	render.setCursorPosition({x: 5, y: 0});
	render('Line A\nLine B\nLine C\n');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// Should: hide cursor, move down to bottom (from y=0 to line 3), then erase + rewrite
	t.assert.ok(secondCall.startsWith(hideCursorEscape));
	t.assert.ok(secondCall.includes(ansiEscapes.cursorDown(3)));
	t.assert.ok(secondCall.includes('Line A'));
});

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() resets cursor state`, (t: TestContext) => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 0});
		render('Line 1\nLine 2\nLine 3\n');

		// Sync() simulates Ink's full-clear (home + erase-down) path: screen is fully reset
		render.sync('Fresh output\n');

		// Next render should NOT include hideCursor + cursorDown (return-to-bottom prefix)
		// because sync() should have reset previousCursorPosition and cursorWasShown
		render('Updated output\n');

		const afterSync = stdout.get();
		t.assert.strictEqual(afterSync.includes(hideCursorEscape), false);
		t.assert.strictEqual(afterSync.includes(ansiEscapes.cursorDown(3)), false);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() writes cursor suffix when cursor is dirty`, (t: TestContext) => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 1});
		render.sync('Line 1\nLine 2\nLine 3\n');

		// Sync() should write cursor suffix to position cursor
		// 3 visible lines, cursor at y=1 → cursorUp(3-1) = cursorUp(2)
		t.assert.strictEqual((stdout.write as any).callCount, 1);
		const written = (stdout.write as any).firstCall.args[0] as string;
		t.assert.strictEqual(
			written,
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() with no trailing newline positions cursor from the last line`, (t: TestContext) => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 1});
		render.sync('Line 1\nLine 2\nLine 3');

		// 3 visible lines without a trailing newline, so the cursor is on line 2.
		// To reach y=1: cursorUp(2 - 1) = cursorUp(1).
		t.assert.strictEqual((stdout.write as any).callCount, 1);
		const written = (stdout.write as any).firstCall.args[0] as string;
		t.assert.strictEqual(
			written,
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(5) + showCursorEscape,
		);
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() with cursor sets cursorWasShown for next render`, (t: TestContext) => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 1});
		render.sync('Line 1\nLine 2\nLine 3\n');

		// Next render should hide cursor before erasing (cursorWasShown = true from sync)
		render('Updated\n');

		const renderCall = stdout.get();
		t.assert.ok(renderCall.startsWith(hideCursorEscape));
	});
}

for (const {name, incremental} of renderingModes) {
	test(`${name} - sync() hides cursor when previous render showed cursor`, (t: TestContext) => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 5, y: 1});
		render('Line 1\nLine 2\nLine 3\n');
		t.assert.strictEqual((stdout.write as any).callCount, 1);

		render.sync('Fresh output\n');

		t.assert.strictEqual((stdout.write as any).callCount, 2);
		t.assert.strictEqual(
			(stdout.write as any).secondCall.args[0] as string,
			hideCursorEscape,
		);
	});
}

test('standard rendering - sync() without cursor does not write to stream', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.sync('Line 1\nLine 2\nLine 3\n');

	t.assert.strictEqual((stdout.write as any).callCount, 0);
});

// No-trailing-newline tests (fullscreen mode)

test('incremental rendering - single line without trailing newline stays on the same row', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Before');
	render('After');

	t.assert.strictEqual(
		(stdout.write as any).secondCall.args[0],
		ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + 'After',
	);
});

test('incremental rendering - growing a single line without trailing newline starts on the same row', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('First');
	render('First\nSecond');

	t.assert.strictEqual(
		(stdout.write as any).secondCall.args[0],
		ansiEscapes.cursorNextLine +
			ansiEscapes.cursorTo(0) +
			ansiEscapes.eraseEndLine +
			'Second',
	);
});

test('incremental rendering - no trailing newline: trailing to no-trailing transition', (t: TestContext) => {
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
	t.assert.ok(secondCall.includes(ansiEscapes.cursorNextLine)); // Skip unchanged A
	t.assert.strictEqual(secondCall.endsWith('\n'), false); // No trailing newline in output
});

test('incremental rendering - no trailing newline: no-trailing to no-trailing update', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('A\nB');
	render('A\nC');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.ok(secondCall.includes(ansiEscapes.cursorNextLine)); // Skip unchanged A
	t.assert.ok(secondCall.includes('C')); // Updates B to C
	t.assert.strictEqual(secondCall.endsWith('\n'), false); // No trailing newline
});

test('incremental rendering - no trailing newline: shrink', (t: TestContext) => {
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
	t.assert.ok(secondCall.includes(ansiEscapes.eraseLines(1)));
	t.assert.strictEqual(secondCall.endsWith('\n'), false); // No trailing newline
});

test('incremental rendering - no trailing newline: cursor after shrink', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render.setCursorPosition({x: 2, y: 0});
	render('Line 1\nLine 2\nLine 3');
	render.setCursorPosition({x: 2, y: 0});
	render('Line 1\nLine 2');

	// The shrink branch reaches the cursor suffix through different arithmetic
	// than the grow/equal branch: eraseLines() + cursorUp(visibleCount) rather
	// than cursorUp(previousLines.length - 1). Both must leave the cursor on
	// the same row the suffix measures from.
	//
	// eraseLines(1) removes "Line 3" without moving off its row, cursorUp(2)
	// lands on row 0, and the loop emits one cursorNextLine for the unchanged
	// "Line 1" and nothing for the unchanged last line, so the cursor ends on
	// row 1 — which is nextLines.length - 1. To reach y=0: cursorUp(1).
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.ok(
		secondCall.endsWith(
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(2) + showCursorEscape,
		),
	);
});

test('incremental rendering - no trailing newline: grow', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('A');
	render('A\nB\nC');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.ok(secondCall.includes('B')); // New line B
	t.assert.ok(secondCall.includes('C')); // New line C
	t.assert.strictEqual(secondCall.endsWith('\n'), false); // No trailing newline
});

test('incremental rendering - no trailing newline: unchanged lines do not overshoot cursor', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('A\nB');
	render('A\nB'); // Identical - should be skipped entirely

	t.assert.strictEqual((stdout.write as any).callCount, 1); // No second write (identical)

	// Now change only the first line
	render('X\nB');

	const thirdCall = (stdout.write as any).secondCall.args[0] as string;
	// Should write X with newline to advance to B's line, then skip B.
	// The buffer ends with the \n that moves to B's line, but no extra
	// cursorNextLine past B -- the cursor stays on the last visible line.
	t.assert.ok(thirdCall.includes('X'));
	// Verify no cursorNextLine appears after B's position (B is unchanged
	// and last, so no cursor movement is emitted for it)
	const lastCursorNextLine = thirdCall.lastIndexOf(ansiEscapes.cursorNextLine);
	t.assert.strictEqual(lastCursorNextLine, -1); // No cursorNextLine at all since A is changed (written) not skipped
});

test('incremental rendering - no trailing newline: cursor lands on the target line', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render.setCursorPosition({x: 7, y: 1});
	render('Line 1\nLine 2\nLine 3\nLine 4');

	// The first render takes the `previousOutput.length === 0` branch, which
	// Ink reaches whenever useStdout().write() clears and restores the frame.
	const firstCall = (stdout.write as any).firstCall.args[0] as string;
	t.assert.ok(
		firstCall.endsWith(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(7) + showCursorEscape,
		),
	);

	render.setCursorPosition({x: 7, y: 1});
	render('Line 1\nLine 2!\nLine 3\nLine 4');

	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	// 4 visible lines without a trailing newline, so the renderer leaves the
	// cursor on line 3. To reach y=1: cursorUp(3 - 1) = cursorUp(2).
	t.assert.ok(
		secondCall.endsWith(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(7) + showCursorEscape,
		),
	);
});

test('standard rendering - no trailing newline: cursor lands on the target line', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {showCursor: true});

	render.setCursorPosition({x: 7, y: 1});
	render('Line 1\nLine 2\nLine 3\nLine 4');

	const written = (stdout.write as any).firstCall.args[0] as string;
	t.assert.ok(
		written.endsWith(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(7) + showCursorEscape,
		),
	);
});

for (const {name, incremental} of renderingModes) {
	test(`${name} - cursor-only update with no trailing newline lands on the target line`, (t: TestContext) => {
		const {stdout, render} = createRenderForMode(incremental);

		render.setCursorPosition({x: 0, y: 3});
		render('Line 1\nLine 2\nLine 3\nLine 4');
		// Same output, cursor moves only: takes the buildCursorOnlySequence path.
		render.setCursorPosition({x: 5, y: 0});
		render('Line 1\nLine 2\nLine 3\nLine 4');

		const secondCall = (stdout.write as any).secondCall.args[0] as string;
		t.assert.ok(
			secondCall.endsWith(
				ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(5) + showCursorEscape,
			),
		);
	});
}

test('incremental rendering - render to empty string (full clear vs early exit)', (t: TestContext) => {
	const stdout = createStdout();
	const render = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});

	render('Line 1\nLine 2\nLine 3\n');
	render('\n');

	t.assert.strictEqual((stdout.write as any).callCount, 2);
	const secondCall = (stdout.write as any).secondCall.args[0] as string;
	t.assert.strictEqual(secondCall, ansiEscapes.eraseLines(4) + '\n'); // Erases all 4 lines + writes single newline

	// Rendering empty string again should be skipped (identical output)
	render('\n');
	t.assert.strictEqual((stdout.write as any).callCount, 2); // No additional write
});
