import test from 'ava';
import {createInputParser, type InputEvent} from '../src/input-parser.js';

const parseChunks = (chunks: string[]): InputEvent[] => {
	const parser = createInputParser();
	const events: InputEvent[] = [];

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

const deleteAndBackspaceCases = [
	{
		title: 'splits batched delete characters into individual events',
		chunks: ['\u007F\u007F\u007F'],
		events: ['\u007F', '\u007F', '\u007F'],
	},
	{
		title: 'splits batched backspace characters into individual events',
		chunks: ['\u0008\u0008\u0008'],
		events: ['\u0008', '\u0008', '\u0008'],
	},
	{
		title: 'splits mixed delete and backspace characters',
		chunks: ['\u007F\u0008\u007F'],
		events: ['\u007F', '\u0008', '\u007F'],
	},
	{
		title: 'splits mixed printable text and delete characters',
		chunks: ['abc\u007F\u007F\u007F'],
		events: ['abc', '\u007F', '\u007F', '\u007F'],
	},
	{
		title: 'single delete character is preserved as individual event',
		chunks: ['\u007F'],
		events: ['\u007F'],
	},
	{
		title: 'single backspace character is preserved as individual event',
		chunks: ['\u0008'],
		events: ['\u0008'],
	},
	{
		title: 'splits trailing delete from text',
		chunks: ['abc\u007F'],
		events: ['abc', '\u007F'],
	},
	{
		title: 'splits delete characters before escape sequences',
		chunks: ['\u007F\u007F\u001B[A'],
		events: ['\u007F', '\u007F', '\u001B[A'],
	},
	{
		title: 'splits delete characters after escape sequences',
		chunks: ['\u001B[A\u007F\u007F'],
		events: ['\u001B[A', '\u007F', '\u007F'],
	},
	{
		title: 'splits delete characters between escape sequences',
		chunks: ['\u001B[A\u007F\u001B[B'],
		events: ['\u001B[A', '\u007F', '\u001B[B'],
	},
	{
		title: 'splits backspace characters around escape sequences',
		chunks: ['\u0008\u001B[A\u0008'],
		events: ['\u0008', '\u001B[A', '\u0008'],
	},
	{
		title: 'splits interleaved text and delete characters',
		chunks: ['ab\u007Fcd'],
		events: ['ab', '\u007F', 'cd'],
	},
	{
		title: 'does not split pasted carriage return from text',
		chunks: ['\rtest'],
		events: ['\rtest'],
	},
	{
		title: 'does not split pasted tab from text',
		chunks: ['\ttest'],
		events: ['\ttest'],
	},
] as const;

for (const testCase of deleteAndBackspaceCases) {
	test(testCase.title, t => {
		t.deepEqual(parseChunks(testCase.chunks), testCase.events);
	});
}

test('assembles CSI sequence from single-byte chunks', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B'), []);
	t.deepEqual(parser.push('['), []);
	t.deepEqual(parser.push('1'), []);
	t.deepEqual(parser.push(';'), []);
	t.deepEqual(parser.push('5'), []);
	t.deepEqual(parser.push('A'), ['\u001B[1;5A']);
});

test('emits paste event for bracketed paste sequence', t => {
	t.deepEqual(parseChunks(['\u001B[200~hello world\u001B[201~']), [
		{paste: 'hello world'},
	]);
});

test('emits paste event for multiline bracketed paste', t => {
	t.deepEqual(parseChunks(['\u001B[200~line1\nline2\u001B[201~']), [
		{paste: 'line1\nline2'},
	]);
});

test('paste content with escape sequences is delivered verbatim', t => {
	t.deepEqual(parseChunks(['\u001B[200~hello\u001B[Aworld\u001B[201~']), [
		{paste: 'hello\u001B[Aworld'},
	]);
});

test('emits normal events before and after bracketed paste', t => {
	t.deepEqual(parseChunks(['before\u001B[200~pasted\u001B[201~after']), [
		'before',
		{paste: 'pasted'},
		'after',
	]);
});

test('emits multiple paste events in one chunk', t => {
	t.deepEqual(
		parseChunks(['\u001B[200~first\u001B[201~mid\u001B[200~second\u001B[201~']),
		[{paste: 'first'}, 'mid', {paste: 'second'}],
	);
});

test('holds incomplete bracketed paste as pending', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B[200~hello'), []);
	t.false(parser.hasPendingEscape());
	t.deepEqual(parser.push(' world\u001B[201~'), [{paste: 'hello world'}]);
});

test('assembles bracketed paste from chunk-by-chunk delivery', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B[200~'), []);
	t.deepEqual(parser.push('hello'), []);
	t.deepEqual(parser.push('\u001B[201~'), [{paste: 'hello'}]);
});

test('emits empty paste for adjacent paste markers', t => {
	t.deepEqual(parseChunks(['\u001B[200~\u001B[201~']), [{paste: ''}]);
});

test('handles pasteStart split before the tilde (\\u001B[200 without ~)', t => {
	const parser = createInputParser();

	// Chunk ends exactly at the 5th byte of the 6-byte pasteStart sequence.
	// Keep waiting for the final `~` to avoid splitting bracketed paste input.
	t.deepEqual(parser.push('\u001B[200'), []);
	t.false(parser.hasPendingEscape());
	t.deepEqual(parser.push('~hello\u001B[201~'), [{paste: 'hello'}]);
});

test('hasPendingEscape returns true for length-3 pasteStart prefix (\\u001B[2)', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B[2'), []);
	t.true(parser.hasPendingEscape());
});

test('hasPendingEscape returns true for length-4 pasteStart prefix (\\u001B[20)', t => {
	const parser = createInputParser();

	t.deepEqual(parser.push('\u001B[20'), []);
	t.true(parser.hasPendingEscape());
});

test('paste event delivers delete and backspace chars verbatim without splitting', t => {
	t.deepEqual(parseChunks(['\u001B[200~\u007F\u0008\u007F\u001B[201~']), [
		{paste: '\u007F\u0008\u007F'},
	]);
});
