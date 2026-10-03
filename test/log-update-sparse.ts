import test, {type TestContext} from 'node:test';
import ansiEscapes from 'ansi-escapes';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

test('incremental updates clear old text beneath cursor-forward gaps', (t: TestContext) => {
	const stdout = createStdout(5);
	const update = logUpdate.create(stdout, {
		incremental: true,
		showCursor: true,
	});
	update('aaaaa');
	update(`b${ansiEscapes.cursorForward(3)}X`);
	t.assert.deepStrictEqual(
		reconstructTerminalLines(stdout.getWrites().join(''), 2),
		['b   X', ''],
	);
});

test('the screen reducer preserves skipped cells until they are erased', (t: TestContext) => {
	t.assert.deepStrictEqual(
		reconstructTerminalLines(`aaaaa\rb${ansiEscapes.cursorForward(3)}X`, 2),
		['baaaX', ''],
	);
	for (const forward of ['\u{1B}[C', '\u{1B}[0C', '\u{1B}[1C']) {
		t.assert.deepStrictEqual(reconstructTerminalLines(`a${forward}b`, 2), [
			'a b',
			'',
		]);
	}
});

for (const ending of ['', '\n']) {
	test(`changed rows clear before painting (trailing newline: ${ending.length > 0})`, (t: TestContext) => {
		const stdout = createStdout(5);
		const update = logUpdate.create(stdout, {
			incremental: true,
			showCursor: true,
		});
		update(`aaaaa${ending}`);
		const row = `b${ansiEscapes.cursorForward(3)}X`;
		update(row + ending);
		t.assert.strictEqual(
			stdout.get(),
			(ending.length > 0 ? ansiEscapes.cursorUp(1) : '') +
				ansiEscapes.cursorTo(0) +
				ansiEscapes.eraseEndLine +
				row +
				ending,
		);
		t.assert.deepStrictEqual(
			reconstructTerminalLines(
				stdout.getWrites().join('').replaceAll('\n', '\r\n'),
				2,
			),
			['b   X', ''],
		);
	});
}

test('full-width updates do not erase after the last character', (t: TestContext) => {
	const stdout = createStdout(5);
	const update = logUpdate.create(stdout, {
		incremental: true,
		showCursor: true,
	});
	update('aaaaa');
	update('bbbbX');
	// Check the write ordering; the reducer does not emulate delayed autowrap.
	t.assert.strictEqual(
		stdout.get(),
		ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + 'bbbbX',
	);
});

test('full-width prefix updates clear only the changed suffix', (t: TestContext) => {
	const stdout = createStdout(5);
	const update = logUpdate.create(stdout, {
		incremental: true,
		showCursor: true,
	});
	update('LEFTX');
	for (const suffix of ['Y', '']) {
		update(`LEFT${suffix}`);
		t.assert.strictEqual(
			stdout.get(),
			ansiEscapes.cursorTo(4) + ansiEscapes.eraseEndLine + suffix,
		);
		t.assert.deepStrictEqual(
			reconstructTerminalLines(stdout.getWrites().join(''), 2),
			[`LEFT${suffix}`, ''],
		);
	}
});

test('shorter, empty, and styled rows remove old trailing content', (t: TestContext) => {
	const stdout = createStdout(10);
	const update = logUpdate.create(stdout, {
		incremental: true,
		showCursor: true,
	});
	for (const [row, expected] of [
		['long text', 'long text'],
		['\u{1B}[31mred\u{1B}[39m', 'red'],
		['x', 'x'],
		['', ''],
	] as const) {
		update(`${row}\nend`);
		const screen = reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			3,
		);
		t.assert.strictEqual(screen[0], expected);
		t.assert.strictEqual(screen[1], 'end');
	}
});

test('sparse updates preserve unchanged rows and the requested cursor', (t: TestContext) => {
	const stdout = createStdout(5);
	const update = logUpdate.create(stdout, {
		incremental: true,
		showCursor: true,
	});
	const cursor = {x: 2, y: 1};
	update.setCursorPosition(cursor);
	update('top\naaaaa\nend');
	update.setCursorPosition(cursor);
	const frame = `top\nb${ansiEscapes.cursorForward(3)}X\nend`;
	update(frame);
	t.assert.deepStrictEqual(
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			3,
		),
		['top', 'b   X', 'end'],
	);
	t.assert.strictEqual(stdout.get().includes('top'), false);
	t.assert.strictEqual(stdout.get().includes('end'), false);
	t.assert.ok(
		stdout
			.get()
			.endsWith(
				ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(2) + '\u{1B}[?25h',
			),
	);
	t.assert.deepStrictEqual(update.getCursorPosition(), cursor);
	const writes = stdout.getWrites().length;
	update.setCursorPosition(cursor);
	t.assert.strictEqual(update(frame), false);
	t.assert.strictEqual(stdout.getWrites().length, writes);
});

test('new rows can grow and shrink around sparse updates', (t: TestContext) => {
	const stdout = createStdout(5);
	const update = logUpdate.create(stdout, {
		incremental: true,
		showCursor: true,
	});
	update('top\naaaaa\n');
	update(`top\nb${ansiEscapes.cursorForward(3)}X\nend\n`);
	update(`top\nc${ansiEscapes.cursorForward(2)}Y\n`);
	t.assert.deepStrictEqual(
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			5,
		),
		['top', 'c  Y', '', '', ''],
	);
});
