import test, {type TestContext} from 'node:test';
import ansiEscapes from 'ansi-escapes';
import lineUpdate from '../src/line-update.js';

const esc = '\u{1B}[';

test('skips an unchanged left region', (t: TestContext) => {
	t.assert.strictEqual(
		lineUpdate(
			'UNCHANGED LEFT      Counter: 0',
			'UNCHANGED LEFT      Counter: 1',
			60,
		),
		ansiEscapes.cursorTo(29) + ansiEscapes.eraseEndLine + '1',
	);
});

test('replays nested styles and extended colors at the changed column', (t: TestContext) => {
	const prefix = `${esc}1m${esc}38;2;10;20;30munchanged ${esc}22m${esc}48;5;100mleft `;
	const suffix = `${esc}49m${esc}39m`;
	t.assert.strictEqual(
		lineUpdate(prefix + '0' + suffix, prefix + '1' + suffix, 80),
		ansiEscapes.cursorTo(15) +
			ansiEscapes.eraseEndLine +
			`${esc}1m${esc}38;2;10;20;30m${esc}22m${esc}48;5;100m1${suffix}`,
	);
});

test('style-only changes repaint the affected text', (t: TestContext) => {
	t.assert.strictEqual(
		lineUpdate(
			`unchanged ${esc}31mword${esc}39m`,
			`unchanged ${esc}32mword${esc}39m`,
			80,
		),
		ansiEscapes.cursorTo(10) +
			ansiEscapes.eraseEndLine +
			`${esc}32mword${esc}39m`,
	);
});

test('does not confuse different parameters inside an SGR sequence', (t: TestContext) => {
	t.assert.strictEqual(
		lineUpdate(
			`unchanged ${esc}38;2;10;20;30mword`,
			`unchanged ${esc}38;2;10;20;31mword`,
			80,
		),
		ansiEscapes.cursorTo(10) +
			ansiEscapes.eraseEndLine +
			`${esc}38;2;10;20;31mword`,
	);
});

for (const {prefix, width} of [
	{prefix: '界面 ', width: 5},
	{prefix: '👩‍💻 ', width: 3},
	{prefix: '🇨🇳 ', width: 3},
	{prefix: '👍🏽 ', width: 3},
	{prefix: 'e\u{301} ', width: 2},
	{prefix: '1\u{FE0F}\u{20E3} ', width: 3},
]) {
	test(`measures unchanged graphemes in terminal cells: ${prefix}`, (t: TestContext) => {
		t.assert.strictEqual(
			lineUpdate(prefix + 'old', prefix + 'new', 80),
			ansiEscapes.cursorTo(width) + ansiEscapes.eraseEndLine + 'new',
		);
	});
}

for (const [previous, next] of [
	['e', 'e\u{301}'],
	['e\u{301}', 'e'],
	['👩‍💻', '👩‍🔬'],
	['👍🏽', '👍🏻'],
	['🇨🇳', '🇨🇦'],
]) {
	test(`repaints a changed grapheme as a whole: ${previous} -> ${next}`, (t: TestContext) => {
		t.assert.strictEqual(
			lineUpdate('unchanged ' + previous, 'unchanged ' + next, 80),
			ansiEscapes.cursorTo(10) + ansiEscapes.eraseEndLine + next,
		);
	});
}

test('keeps a grapheme intact when SGR occurs inside it', (t: TestContext) => {
	t.assert.strictEqual(
		lineUpdate(
			`unchanged e${esc}31m\u{301}`,
			`unchanged e${esc}32m\u{301}`,
			80,
		),
		ansiEscapes.cursorTo(10) + ansiEscapes.eraseEndLine + `e${esc}32m\u{301}`,
	);
});

test('retains trailing resets when shortening a styled line', (t: TestContext) => {
	t.assert.strictEqual(
		lineUpdate(
			`${esc}31munchanged longer${esc}39m`,
			`${esc}31munchanged${esc}39m`,
			80,
		),
		ansiEscapes.cursorTo(9) + ansiEscapes.eraseEndLine + `${esc}31m${esc}39m`,
	);
});

for (const control of [
	'\t',
	'\r',
	'\b',
	'\u{7}',
	`${esc}2C`,
	'\u{1B}]8;;https://example.com\u{7}',
	'\u{1B}Pdata\u{1B}\\',
	'\u{9B}31m',
]) {
	test(`falls back for unsupported control ${JSON.stringify(control)}`, (t: TestContext) => {
		const previous = 'unchanged ' + control + 'old';
		const next = 'unchanged ' + control + 'new';
		t.assert.strictEqual(
			lineUpdate(previous, next, 80),
			ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + next,
		);
		t.assert.strictEqual(
			lineUpdate(previous, 'unchanged new', 80),
			ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + 'unchanged new',
		);
	});
}

test('falls back when the prefix reaches the right margin', (t: TestContext) => {
	const next = `1234567890${esc}0m`;
	t.assert.strictEqual(
		lineUpdate('1234567890', next, 10),
		ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + next,
	);
});

test('can update the last cell without moving beyond the right margin', (t: TestContext) => {
	t.assert.strictEqual(
		lineUpdate('1234567890', '1234567891', 10),
		ansiEscapes.cursorTo(9) + ansiEscapes.eraseEndLine + '1',
	);
});

test('falls back for wrapping lines and unknown terminal widths', (t: TestContext) => {
	for (const columns of [undefined, 0, 5]) {
		t.assert.strictEqual(
			lineUpdate('unchanged old', 'unchanged new', columns),
			ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + 'unchanged new',
		);
	}
});

test('does not increase output size for short prefixes', (t: TestContext) => {
	t.assert.strictEqual(
		lineUpdate('a0', 'a1', 80),
		ansiEscapes.cursorTo(1) + ansiEscapes.eraseEndLine + '1',
	);
	t.assert.strictEqual(
		lineUpdate(`${esc}31m0`, `${esc}32m0`, 80),
		ansiEscapes.cursorTo(0) + ansiEscapes.eraseEndLine + `${esc}32m0`,
	);
});
