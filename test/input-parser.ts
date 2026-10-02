import test, {type TestContext} from 'node:test';
import {
	createInputParser,
	isCompleteControlSequence,
	type InputEvent,
} from '../src/input-parser.js';

const parseChunks = (chunks: string[]): InputEvent[] => {
	const parser = createInputParser();
	const events: InputEvent[] = [];

	for (const chunk of chunks) {
		events.push(...parser.push(chunk));
	}

	return events;
};

test('passes through plain text chunks', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['hello', ' ', 'world']), [
		'hello',
		' ',
		'world',
	]);
});

test('keeps plain text and control sequences separate', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['a\u{1B}[Ab']), ['a', '\u{1B}[A', 'b']);
});

test('parses multiple standard CSI keys in one chunk', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[A\u{1B}[B\u{1B}[C\u{1B}[D']), [
		'\u{1B}[A',
		'\u{1B}[B',
		'\u{1B}[C',
		'\u{1B}[D',
	]);
});

test('parses CSI sequences with parameters', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[1;5A\u{1B}[5~\u{1B}[6~']), [
		'\u{1B}[1;5A',
		'\u{1B}[5~',
		'\u{1B}[6~',
	]);
});

test('keeps rxvt shifted editing keys separate from following text', (t: TestContext) => {
	for (const key of [2, 3, 5, 6, 7, 8]) {
		const sequence = `\u{1B}[${key}$`;

		t.assert.deepStrictEqual(parseChunks([`${sequence}hello`]), [
			sequence,
			'hello',
		]);
	}
});

test('emits rxvt Shift+Delete as soon as its final byte arrives', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}[3'), []);
	t.assert.deepStrictEqual(parser.push('$'), ['\u{1B}[3$']);
	t.assert.strictEqual(parser.hasPendingEscape(), false);
	t.assert.deepStrictEqual(parser.push('hello'), ['hello']);
});

test('parses consecutive rxvt shifted keys including meta', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[3$\u{1B}\u{1B}[5$\u{1B}[A']), [
		'\u{1B}[3$',
		'\u{1B}\u{1B}[5$',
		'\u{1B}[A',
	]);
});

test('preserves CSI intermediate bytes outside rxvt shifted keys', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[1;', '2$', 'yhello']), [
		'\u{1B}[1;2$y',
		'hello',
	]);
});

test('parses kitty protocol sequence as one key event', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[97;5u']), ['\u{1B}[97;5u']);
});

test('parses SS3 sequences as one key event', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}OA\u{1B}OB\u{1B}OC\u{1B}OD']), [
		'\u{1B}OA',
		'\u{1B}OB',
		'\u{1B}OC',
		'\u{1B}OD',
	]);
});

test('preserves modified SS3 keys and following text', (t: TestContext) => {
	for (const sequence of ['\u{1B}O2P', '\u{1B}O1;5A', '\u{1B}\u{1B}O5D']) {
		t.assert.deepStrictEqual(parseChunks([`${sequence}hello`]), [
			sequence,
			'hello',
		]);
	}
});

test('holds modified SS3 sequences until their final byte arrives', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}O1'), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.deepStrictEqual(parser.push(';5'), []);
	t.assert.deepStrictEqual(parser.push('A'), ['\u{1B}O1;5A']);
	t.assert.strictEqual(parser.hasPendingEscape(), false);
});

test('does not consume a following escape as SS3 final byte', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}O\u{1B}[A']), [
		'\u{1B}O',
		'\u{1B}[A',
	]);
});

test('parses meta+CSI sequence with double escape', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}\u{1B}[A']), ['\u{1B}\u{1B}[A']);
});

test('parses escaped printable code points', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}x\u{1B}1']), [
		'\u{1B}x',
		'\u{1B}1',
	]);
});

test('parses escaped supplementary code points', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}😀']), ['\u{1B}😀']);
});

test('preserves legacy ESC[[... sequences in a mixed chunk', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[[A\u{1B}[[5~']), [
		'\u{1B}[[A',
		'\u{1B}[[5~',
	]);
});

test('preserves legacy ESC[[... sequences across chunks', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[[', 'A\u{1B}[[5~']), [
		'\u{1B}[[A',
		'\u{1B}[[5~',
	]);
});

test('parses legacy and standard CSI sequences mixed together', (t: TestContext) => {
	t.assert.deepStrictEqual(
		parseChunks(['\u{1B}[[A\u{1B}[B\u{1B}[[6~\u{1B}[1;5D']),
		['\u{1B}[[A', '\u{1B}[B', '\u{1B}[[6~', '\u{1B}[1;5D'],
	);
});

test('holds incomplete CSI sequence until final byte arrives', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}['), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.deepStrictEqual(parser.push('1;5'), []);
	t.assert.deepStrictEqual(parser.push('A'), ['\u{1B}[1;5A']);
});

test('holds incomplete legacy ESC[[... sequence until final byte arrives', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}[['), []);
	t.assert.deepStrictEqual(parser.push('5'), []);
	t.assert.deepStrictEqual(parser.push('~'), ['\u{1B}[[5~']);
});

test('holds incomplete SS3 sequence until final byte arrives', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}O'), []);
	t.assert.deepStrictEqual(parser.push('A'), ['\u{1B}OA']);
});

test('holds incomplete double-escape CSI sequence until final byte arrives', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}\u{1B}['), []);
	t.assert.deepStrictEqual(parser.push('A'), ['\u{1B}\u{1B}[A']);
});

test('keeps pending plain escape and can flush it', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}'), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.strictEqual(parser.flushPendingEscape(), '\u{1B}');
	t.assert.strictEqual(parser.hasPendingEscape(), false);
});

test('flushes pending CSI prefix as literal input', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}['), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.strictEqual(parser.flushPendingEscape(), '\u{1B}[');
	t.assert.strictEqual(parser.hasPendingEscape(), false);
	t.assert.deepStrictEqual(parser.push('A'), ['A']);
});

test('reset clears pending input state', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}['), []);
	parser.reset();
	t.assert.deepStrictEqual(parser.push('A'), ['A']);
});

test('treats invalid CSI continuation as escaped code point plus plain text', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[\n']), ['\u{1B}[', '\n']);
});

test('parses mixed text and many key events in one read', (t: TestContext) => {
	t.assert.deepStrictEqual(
		parseChunks(['start\u{1B}[A mid \u{1B}OH end\u{1B}[[5~']),
		['start', '\u{1B}[A', ' mid ', '\u{1B}OH', ' end', '\u{1B}[[5~'],
	);
});

test('flushes pending SS3 prefix as literal input', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}O'), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.strictEqual(parser.flushPendingEscape(), '\u{1B}O');
	t.assert.deepStrictEqual(parser.push('x'), ['x']);
});

test('flushes pending legacy CSI prefix as literal input', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}[['), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.strictEqual(parser.flushPendingEscape(), '\u{1B}[[');
	t.assert.deepStrictEqual(parser.push('x'), ['x']);
});

test('parses meta+SS3 sequence with double escape', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}\u{1B}OA']), ['\u{1B}\u{1B}OA']);
});

test('holds incomplete double-escape SS3 sequence until final byte arrives', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}\u{1B}O'), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.deepStrictEqual(parser.push('A'), ['\u{1B}\u{1B}OA']);
});

test('emits double escape as single event for non-control character', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}\u{1B}x']), [
		'\u{1B}\u{1B}',
		'x',
	]);
});

test('empty chunk produces no events', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['']), []);
});

test('empty chunk does not disturb pending state', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}['), []);
	t.assert.deepStrictEqual(parser.push(''), []);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.deepStrictEqual(parser.push('A'), ['\u{1B}[A']);
});

test('plain text followed by incomplete escape holds escape as pending', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('hello\u{1B}'), ['hello']);
	t.assert.ok(parser.hasPendingEscape());
	t.assert.strictEqual(parser.flushPendingEscape(), '\u{1B}');
});

const backspaceAndDeleteCases = [
	{
		title: 'splits batched 0x7F backspace characters into individual events',
		chunks: ['\u{7F}\u{7F}\u{7F}'],
		events: ['\u{7F}', '\u{7F}', '\u{7F}'],
	},
	{
		title: 'splits batched backspace characters into individual events',
		chunks: ['\u{8}\u{8}\u{8}'],
		events: ['\u{8}', '\u{8}', '\u{8}'],
	},
	{
		title: 'splits mixed 0x7F and 0x08 backspace characters',
		chunks: ['\u{7F}\u{8}\u{7F}'],
		events: ['\u{7F}', '\u{8}', '\u{7F}'],
	},
	{
		title: 'splits mixed printable text and 0x7F backspace characters',
		chunks: ['abc\u{7F}\u{7F}\u{7F}'],
		events: ['abc', '\u{7F}', '\u{7F}', '\u{7F}'],
	},
	{
		title: 'single 0x7F backspace character is preserved as individual event',
		chunks: ['\u{7F}'],
		events: ['\u{7F}'],
	},
	{
		title: 'single backspace character is preserved as individual event',
		chunks: ['\u{8}'],
		events: ['\u{8}'],
	},
	{
		title: 'splits trailing 0x7F backspace from text',
		chunks: ['abc\u{7F}'],
		events: ['abc', '\u{7F}'],
	},
	{
		title: 'splits 0x7F backspace characters before escape sequences',
		chunks: ['\u{7F}\u{7F}\u{1B}[A'],
		events: ['\u{7F}', '\u{7F}', '\u{1B}[A'],
	},
	{
		title: 'splits 0x7F backspace characters after escape sequences',
		chunks: ['\u{1B}[A\u{7F}\u{7F}'],
		events: ['\u{1B}[A', '\u{7F}', '\u{7F}'],
	},
	{
		title: 'splits 0x7F backspace characters between escape sequences',
		chunks: ['\u{1B}[A\u{7F}\u{1B}[B'],
		events: ['\u{1B}[A', '\u{7F}', '\u{1B}[B'],
	},
	{
		title: 'splits backspace characters around escape sequences',
		chunks: ['\u{8}\u{1B}[A\u{8}'],
		events: ['\u{8}', '\u{1B}[A', '\u{8}'],
	},
	{
		title: 'splits interleaved text and 0x7F backspace characters',
		chunks: ['ab\u{7F}cd'],
		events: ['ab', '\u{7F}', 'cd'],
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

for (const testCase of backspaceAndDeleteCases) {
	test(testCase.title, (t: TestContext) => {
		t.assert.deepStrictEqual(parseChunks(testCase.chunks), testCase.events);
	});
}

test('assembles CSI sequence from single-byte chunks', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}'), []);
	t.assert.deepStrictEqual(parser.push('['), []);
	t.assert.deepStrictEqual(parser.push('1'), []);
	t.assert.deepStrictEqual(parser.push(';'), []);
	t.assert.deepStrictEqual(parser.push('5'), []);
	t.assert.deepStrictEqual(parser.push('A'), ['\u{1B}[1;5A']);
});

test('emits paste event for bracketed paste sequence', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[200~hello world\u{1B}[201~']), [
		{paste: 'hello world'},
	]);
});

test('emits paste event for multiline bracketed paste', (t: TestContext) => {
	t.assert.deepStrictEqual(
		parseChunks(['\u{1B}[200~line1\nline2\u{1B}[201~']),
		[{paste: 'line1\nline2'}],
	);
});

test('paste content with escape sequences is delivered verbatim', (t: TestContext) => {
	t.assert.deepStrictEqual(
		parseChunks(['\u{1B}[200~hello\u{1B}[Aworld\u{1B}[201~']),
		[{paste: 'hello\u{1B}[Aworld'}],
	);
});

test('emits normal events before and after bracketed paste', (t: TestContext) => {
	t.assert.deepStrictEqual(
		parseChunks(['before\u{1B}[200~pasted\u{1B}[201~after']),
		['before', {paste: 'pasted'}, 'after'],
	);
});

test('emits multiple paste events in one chunk', (t: TestContext) => {
	t.assert.deepStrictEqual(
		parseChunks(['\u{1B}[200~first\u{1B}[201~mid\u{1B}[200~second\u{1B}[201~']),
		[{paste: 'first'}, 'mid', {paste: 'second'}],
	);
});

test('holds incomplete bracketed paste as pending', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}[200~hello'), []);
	t.assert.strictEqual(parser.hasPendingEscape(), false);
	t.assert.deepStrictEqual(parser.push(' world\u{1B}[201~'), [
		{paste: 'hello world'},
	]);
});

test('assembles bracketed paste from chunk-by-chunk delivery', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}[200~'), []);
	t.assert.deepStrictEqual(parser.push('hello'), []);
	t.assert.deepStrictEqual(parser.push('\u{1B}[201~'), [{paste: 'hello'}]);
});

test('emits empty paste for adjacent paste markers', (t: TestContext) => {
	t.assert.deepStrictEqual(parseChunks(['\u{1B}[200~\u{1B}[201~']), [
		{paste: ''},
	]);
});

test('handles pasteStart split before the tilde (\\u001B[200 without ~)', (t: TestContext) => {
	const parser = createInputParser();

	// Chunk ends exactly at the 5th byte of the 6-byte pasteStart sequence.
	// Keep waiting for the final `~` to avoid splitting bracketed paste input.
	t.assert.deepStrictEqual(parser.push('\u{1B}[200'), []);
	t.assert.strictEqual(parser.hasPendingEscape(), false);
	t.assert.deepStrictEqual(parser.push('~hello\u{1B}[201~'), [
		{paste: 'hello'},
	]);
});

test('hasPendingEscape returns true for length-3 pasteStart prefix (\\u001B[2)', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}[2'), []);
	t.assert.ok(parser.hasPendingEscape());
});

test('hasPendingEscape returns true for length-4 pasteStart prefix (\\u001B[20)', (t: TestContext) => {
	const parser = createInputParser();

	t.assert.deepStrictEqual(parser.push('\u{1B}[20'), []);
	t.assert.ok(parser.hasPendingEscape());
});

test('paste event delivers backspace chars verbatim without splitting', (t: TestContext) => {
	t.assert.deepStrictEqual(
		parseChunks(['\u{1B}[200~\u{7F}\u{8}\u{7F}\u{1B}[201~']),
		[{paste: '\u{7F}\u{8}\u{7F}'}],
	);
});

test('isCompleteControlSequence accepts every complete CSI and SS3 form the parser emits', (t: TestContext) => {
	for (const sequence of [
		'\u{1B}[A',
		'\u{1B}[I',
		'\u{1B}[24;80R',
		'\u{1B}[<0;10;20M',
		'\u{1B}[[A',
		'\u{1B}[2$',
		'\u{1B}[ q',
		'\u{1B}OP',
		'\u{1B}O1;5A',
		'\u{1B}\u{1B}[A',
		'\u{1B}\u{1B}O5D',
	]) {
		t.assert.ok(
			isCompleteControlSequence(sequence),
			`Sequence: ${JSON.stringify(sequence)}`,
		);
		t.assert.deepStrictEqual(parseChunks([sequence]), [sequence]);
	}
});

test('isCompleteControlSequence rejects partial sequences and escaped code points', (t: TestContext) => {
	for (const input of [
		'',
		'q',
		'\u{1B}',
		'\u{1B}[',
		'\u{1B}[1;',
		'\u{1B}[[',
		'\u{1B}O',
		'\u{1B}O1',
		'\u{1B}x',
		'\u{1B}\u{1B}',
		'\u{1B}\u{1B}x',
		'\u{1B}[1$',
		'\u{1B}[Aq',
	]) {
		t.assert.strictEqual(
			isCompleteControlSequence(input),
			false,
			`Input: ${JSON.stringify(input)}`,
		);
	}
});
