import test from 'ava';
import {createInputParser} from '../src/input-parser.js';

const parseChunks = (chunks: string[]): string[] => {
	const parser = createInputParser();
	const events: string[] = [];

	for (const chunk of chunks) {
		events.push(...parser.push(chunk));
	}

	return events;
};

test('passes through plain text chunks', t => {
	t.deepEqual(parseChunks(['hello', ' ', 'world']), ['hello', ' ', 'world']);
});

test('keeps plain text and control sequences separate', t => {
	t.deepEqual(parseChunks(['a\u001B[Ab']), ['a', '\u001B[A', 'b']);
});

test('parses multiple standard CSI keys in one chunk', t => {
	t.deepEqual(parseChunks(['\u001B[A\u001B[B\u001B[C\u001B[D']), [
		'\u001B[A',
		'\u001B[B',
		'\u001B[C',
		'\u001B[D',
	]);
});

test('parses CSI sequences with parameters', t => {
	t.deepEqual(parseChunks(['\u001B[1;5A\u001B[5~\u001B[6~']), [
		'\u001B[1;5A',
		'\u001B[5~',
		'\u001B[6~',
	]);
});

test('parses kitty protocol sequence as one key event', t => {
	t.deepEqual(parseChunks(['\u001B[97;5u']), ['\u001B[97;5u']);
});

test('parses SS3 sequences as one key event', t => {
	t.deepEqual(parseChunks(['\u001BOA\u001BOB\u001BOC\u001BOD']), [
		'\u001BOA',
		'\u001BOB',
		'\u001BOC',
		'\u001BOD',
	]);
});

test('does not consume a following escape as SS3 final byte', t => {
	t.deepEqual(parseChunks(['\u001BO\u001B[A']), ['\u001BO', '\u001B[A']);
});

test('parses meta+CSI sequence with double escape', t => {
	t.deepEqual(parseChunks(['\u001B\u001B[A']), ['\u001B\u001B[A']);
});

test('parses escaped printable code points', t => {
	t.deepEqual(parseChunks(['\u001Bx\u001B1']), ['\u001Bx', '\u001B1']);
});

test('parses escaped supplementary code points', t => {
	t.deepEqual(parseChunks(['\u001B😀']), ['\u001B😀']);
});

test('preserves legacy ESC[[... sequences in a mixed chunk', t => {
	t.deepEqual(parseChunks(['\u001B[[A\u001B[[5~']), [
		'\u001B[[A',
		'\u001B[[5~',
	]);
});

test('preserves legacy ESC[[... sequences across chunks', t => {
	t.deepEqual(parseChunks(['\u001B[[', 'A\u001B[[5~']), [
		'\u001B[[A',
		'\u001B[[5~',
	]);
});

test('parses legacy and standard CSI sequences mixed together', t => {
	t.deepEqual(parseChunks(['\u001B[[A\u001B[B\u001B[[6~\u001B[1;5D']), [
		'\u001B[[A',
		'\u001B[B',
		'\u001B[[6~',
		'\u001B[1;5D',
	]);
});

test('holds incomplete CSI sequence until final byte arrives', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B['), []);
	t.true(parser.hasPendingEscape());
	t.deepEqual(parser.push('1;5'), []);
	t.deepEqual(parser.push('A'), ['\u001B[1;5A']);
});

test('holds incomplete legacy ESC[[... sequence until final byte arrives', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B[['), []);
	t.deepEqual(parser.push('5'), []);
	t.deepEqual(parser.push('~'), ['\u001B[[5~']);
});

test('holds incomplete SS3 sequence until final byte arrives', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001BO'), []);
	t.deepEqual(parser.push('A'), ['\u001BOA']);
});

test('holds incomplete double-escape CSI sequence until final byte arrives', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B\u001B['), []);
	t.deepEqual(parser.push('A'), ['\u001B\u001B[A']);
});

test('keeps pending plain escape and can flush it', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B'), []);
	t.true(parser.hasPendingEscape());
	t.is(parser.flushPendingEscape(), '\u001B');
	t.false(parser.hasPendingEscape());
});

test('flushes pending CSI prefix as literal input', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B['), []);
	t.true(parser.hasPendingEscape());
	t.is(parser.flushPendingEscape(), '\u001B[');
	t.false(parser.hasPendingEscape());
	t.deepEqual(parser.push('A'), ['A']);
});

test('reset clears pending input state', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B['), []);
	parser.reset();
	t.deepEqual(parser.push('A'), ['A']);
});

test('treats invalid CSI continuation as escaped code point plus plain text', t => {
	t.deepEqual(parseChunks(['\u001B[\n']), ['\u001B[', '\n']);
});

test('parses mixed text and many key events in one read', t => {
	t.deepEqual(parseChunks(['start\u001B[A mid \u001BOH end\u001B[[5~']), [
		'start',
		'\u001B[A',
		' mid ',
		'\u001BOH',
		' end',
		'\u001B[[5~',
	]);
});

test('flushes pending SS3 prefix as literal input', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001BO'), []);
	t.true(parser.hasPendingEscape());
	t.is(parser.flushPendingEscape(), '\u001BO');
	t.deepEqual(parser.push('x'), ['x']);
});

test('flushes pending legacy CSI prefix as literal input', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B[['), []);
	t.true(parser.hasPendingEscape());
	t.is(parser.flushPendingEscape(), '\u001B[[');
	t.deepEqual(parser.push('x'), ['x']);
});

test('parses meta+SS3 sequence with double escape', t => {
	t.deepEqual(parseChunks(['\u001B\u001BOA']), ['\u001B\u001BOA']);
});

test('holds incomplete double-escape SS3 sequence until final byte arrives', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B\u001BO'), []);
	t.true(parser.hasPendingEscape());
	t.deepEqual(parser.push('A'), ['\u001B\u001BOA']);
});

test('emits double escape as single event for non-control character', t => {
	t.deepEqual(parseChunks(['\u001B\u001Bx']), ['\u001B\u001B', 'x']);
});

test('empty chunk produces no events', t => {
	t.deepEqual(parseChunks(['']), []);
});

test('empty chunk does not disturb pending state', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B['), []);
	t.deepEqual(parser.push(''), []);
	t.true(parser.hasPendingEscape());
	t.deepEqual(parser.push('A'), ['\u001B[A']);
});

test('plain text followed by incomplete escape holds escape as pending', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('hello\u001B'), ['hello']);
	t.true(parser.hasPendingEscape());
	t.is(parser.flushPendingEscape(), '\u001B');
});

test('assembles CSI sequence from single-byte chunks', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B'), []);
	t.deepEqual(parser.push('['), []);
	t.deepEqual(parser.push('1'), []);
	t.deepEqual(parser.push(';'), []);
	t.deepEqual(parser.push('5'), []);
	t.deepEqual(parser.push('A'), ['\u001B[1;5A']);
});
