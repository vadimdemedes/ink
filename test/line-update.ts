import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import lineUpdate from '../src/line-update.js';

const esc = '\u001B[';

test('skips an unchanged left region', t => {
	t.is(
		lineUpdate(
			'UNCHANGED LEFT      Counter: 0',
			'UNCHANGED LEFT      Counter: 1',
			60,
		),
		ansiEscapes.cursorTo(29) + '1',
	);
});

test('replays nested styles and extended colors at the changed column', t => {
	const prefix = `${esc}1m${esc}38;2;10;20;30munchanged ${esc}22m${esc}48;5;100mleft `;
	const suffix = `${esc}49m${esc}39m`;
	t.is(
		lineUpdate(prefix + '0' + suffix, prefix + '1' + suffix, 80),
		ansiEscapes.cursorTo(15) +
			`${esc}1m${esc}38;2;10;20;30m${esc}22m${esc}48;5;100m1${suffix}`,
	);
});

test('style-only changes repaint the affected text', t => {
	t.is(
		lineUpdate(
			`unchanged ${esc}31mword${esc}39m`,
			`unchanged ${esc}32mword${esc}39m`,
			80,
		),
		ansiEscapes.cursorTo(10) + `${esc}32mword${esc}39m`,
	);
});

test('does not confuse different parameters inside an SGR sequence', t => {
	t.is(
		lineUpdate(
			`unchanged ${esc}38;2;10;20;30mword`,
			`unchanged ${esc}38;2;10;20;31mword`,
			80,
		),
		ansiEscapes.cursorTo(10) + `${esc}38;2;10;20;31mword`,
	);
});

for (const {prefix, width} of [
	{prefix: '界面 ', width: 5},
	{prefix: '👩‍💻 ', width: 3},
	{prefix: '🇨🇳 ', width: 3},
	{prefix: '👍🏽 ', width: 3},
	{prefix: 'e\u0301 ', width: 2},
	{prefix: '1\uFE0F\u20E3 ', width: 3},
]) {
	test(`measures unchanged graphemes in terminal cells: ${prefix}`, t => {
		t.is(
			lineUpdate(prefix + 'old', prefix + 'new', 80),
			ansiEscapes.cursorTo(width) + 'new',
		);
	});
}

for (const [previous, next] of [
	['e', 'e\u0301'],
	['e\u0301', 'e'],
	['👩‍💻', '👩‍🔬'],
	['👍🏽', '👍🏻'],
	['🇨🇳', '🇨🇦'],
]) {
	test(`repaints a changed grapheme as a whole: ${previous} -> ${next}`, t => {
		t.is(
			lineUpdate('unchanged ' + previous, 'unchanged ' + next, 80),
			ansiEscapes.cursorTo(10) + next,
		);
	});
}

test('keeps a grapheme intact when SGR occurs inside it', t => {
	t.is(
		lineUpdate(`unchanged e${esc}31m\u0301`, `unchanged e${esc}32m\u0301`, 80),
		ansiEscapes.cursorTo(10) + `e${esc}32m\u0301`,
	);
});

test('retains trailing resets when shortening a styled line', t => {
	t.is(
		lineUpdate(
			`${esc}31munchanged longer${esc}39m`,
			`${esc}31munchanged${esc}39m`,
			80,
		),
		ansiEscapes.cursorTo(9) + `${esc}31m${esc}39m`,
	);
});

for (const control of [
	'\t',
	'\r',
	'\b',
	'\u0007',
	`${esc}2C`,
	'\u001B]8;;https://example.com\u0007',
	'\u001BPdata\u001B\\',
	'\u009B31m',
]) {
	test(`falls back for unsupported control ${JSON.stringify(control)}`, t => {
		const previous = 'unchanged ' + control + 'old';
		const next = 'unchanged ' + control + 'new';
		t.is(lineUpdate(previous, next, 80), ansiEscapes.cursorTo(0) + next);
		t.is(
			lineUpdate(previous, 'unchanged new', 80),
			ansiEscapes.cursorTo(0) + 'unchanged new',
		);
	});
}

test('falls back when the prefix reaches the right margin', t => {
	const next = `1234567890${esc}0m`;
	t.is(lineUpdate('1234567890', next, 10), ansiEscapes.cursorTo(0) + next);
});

test('can update the last cell without moving beyond the right margin', t => {
	t.is(
		lineUpdate('1234567890', '1234567891', 10),
		ansiEscapes.cursorTo(9) + '1',
	);
});

test('falls back for wrapping lines and unknown terminal widths', t => {
	for (const columns of [undefined, 0, 5]) {
		t.is(
			lineUpdate('unchanged old', 'unchanged new', columns),
			ansiEscapes.cursorTo(0) + 'unchanged new',
		);
	}
});

test('does not increase output size for short prefixes', t => {
	t.is(lineUpdate('a0', 'a1', 80), ansiEscapes.cursorTo(1) + '1');
	t.is(
		lineUpdate(`${esc}31m0`, `${esc}32m0`, 80),
		ansiEscapes.cursorTo(0) + `${esc}32m0`,
	);
});
