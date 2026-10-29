import {Buffer} from 'node:buffer';
import test, {type TestContext} from 'node:test';
import parseKeypress from '../src/parse-keypress.js';

test('parsing a single-byte Meta key does not mutate the input', (t: TestContext) => {
	const input = new Uint8Array([0xe1]);
	const firstKey = parseKeypress(input);

	t.assert.partialDeepStrictEqual(firstKey, {
		name: 'a',
		meta: true,
		sequence: 'a',
	});
	t.assert.deepStrictEqual(input, new Uint8Array([0xe1]));
	t.assert.deepStrictEqual(parseKeypress(input), firstKey);
});

test('Meta byte parsing preserves shared buffers across the full byte range', (t: TestContext) => {
	for (let byte = 128; byte <= 255; byte++) {
		const buffer = Buffer.from([0, byte, 0]);
		const input = buffer.subarray(1, 2);
		const expected = parseKeypress(`${String.fromCodePoint(byte - 128)}`);

		t.assert.deepStrictEqual(parseKeypress(input), expected);
		t.assert.deepStrictEqual(buffer, Buffer.from([0, byte, 0]));
		t.assert.deepStrictEqual(parseKeypress(input), expected);
	}
});

test('byte parsing preserves ASCII and multibyte UTF-8 input', (t: TestContext) => {
	for (const text of ['a', 'hello', 'é', '😀']) {
		const input = Buffer.from(text);
		t.assert.deepStrictEqual(parseKeypress(input), parseKeypress(text));
		t.assert.deepStrictEqual(input, Buffer.from(text));
	}
});

test('kitty functional keys preserve modifiers without an explicit event type', (t: TestContext) => {
	for (const [sequence, name] of [
		['\u{1B}[1;249A', 'up'],
		['\u{1B}[3;249~', 'delete'],
		['\u{1B}[13;249~', 'f3'],
		['\u{1B}[1;249P', 'f1'],
	] as const) {
		t.assert.partialDeepStrictEqual(parseKeypress(sequence), {
			name,
			super: true,
			hyper: true,
			meta: true,
			capsLock: true,
			numLock: true,
			ctrl: false,
			shift: false,
			eventType: 'press',
			isPrintable: false,
		});
	}

	t.assert.partialDeepStrictEqual(parseKeypress('\u{1B}[1;9A'), {
		super: true,
		meta: false,
	});
});

test('kitty modifiers and event types agree across key encodings', (t: TestContext) => {
	const modifierNames = [
		'shift',
		'meta',
		'ctrl',
		'super',
		'hyper',
		'meta',
		'capsLock',
		'numLock',
	] as const;
	for (const [bit, modifierName] of modifierNames.entries()) {
		for (const [eventCode, eventType] of [
			['', 'press'],
			[':1', 'press'],
			[':2', 'repeat'],
			[':3', 'release'],
		] as const) {
			const modifiers = `${2 ** bit + 1}${eventCode}`;
			for (const sequence of [
				`\u{1B}[97;${modifiers}u`,
				`\u{1B}[1;${modifiers}A`,
				`\u{1B}[3;${modifiers}~`,
			]) {
				const key = parseKeypress(sequence);
				t.assert.ok(key[modifierName], `Sequence: ${sequence}`);
				t.assert.strictEqual(key.eventType, eventType, `Sequence: ${sequence}`);
			}
		}
	}
});

test('kitty keypad Begin supports both functional encodings', (t: TestContext) => {
	for (const sequence of [
		'\u{1B}[1E',
		'\u{1B}[57427~',
		'\u{1B}[1;1:2E',
		'\u{1B}[57427;1:2~',
	]) {
		t.assert.strictEqual(parseKeypress(sequence).name, 'clear');
	}
});

test('kitty text-only events have no key identity', (t: TestContext) => {
	t.assert.partialDeepStrictEqual(parseKeypress('\u{1B}[0;;229:128169u'), {
		name: '',
		text: 'å💩',
		isPrintable: true,
	});
});

test('kitty unknown functional and control codes do not invent printable characters', (t: TestContext) => {
	for (const codepoint of [0, 1, 3, 31, 128, 159, 57_344, 63_743]) {
		t.assert.partialDeepStrictEqual(parseKeypress(`\u{1B}[${codepoint}u`), {
			name: '',
			isPrintable: false,
			text: undefined,
		});
	}

	t.assert.partialDeepStrictEqual(parseKeypress('\u{1B}[63744u'), {
		text: String.fromCodePoint(63_744),
		isPrintable: true,
	});
});

test('legacy Ctrl+Space preserves the space key and modifiers', (t: TestContext) => {
	for (const sequence of ['\u{0}', '\u{1B}\u{0}']) {
		t.assert.partialDeepStrictEqual(parseKeypress(sequence), {
			name: 'space',
			ctrl: true,
			meta: sequence.length === 2,
			shift: false,
			sequence,
		});
	}
});

test('kitty keypad navigation keys use standard key names', (t: TestContext) => {
	for (const [codepoint, name] of [
		[57_417, 'left'],
		[57_418, 'right'],
		[57_419, 'up'],
		[57_420, 'down'],
		[57_421, 'pageup'],
		[57_422, 'pagedown'],
		[57_423, 'home'],
		[57_424, 'end'],
		[57_425, 'insert'],
		[57_426, 'delete'],
	] as const) {
		const sequence = `\u{1B}[${codepoint};5:2u`;
		t.assert.partialDeepStrictEqual(parseKeypress(sequence), {
			name,
			ctrl: true,
			eventType: 'repeat',
			isKittyProtocol: true,
			isPrintable: false,
			text: undefined,
			sequence,
		});
	}
});

test('legacy Ctrl+punctuation shortcuts preserve the key and modifiers', (t: TestContext) => {
	for (const [character, name] of [
		['\u{1C}', '\\'],
		['\u{1D}', ']'],
		['\u{1E}', '^'],
		['\u{1F}', '_'],
	]) {
		for (const prefix of ['', '\u{1B}']) {
			const sequence = prefix + character;
			t.assert.partialDeepStrictEqual(parseKeypress(sequence), {
				name,
				ctrl: true,
				meta: prefix.length > 0,
				shift: false,
				sequence,
			});
		}
	}
});

test('kitty alternate key codes preserve the primary key event', (t: TestContext) => {
	for (const sequence of [
		'\u{1B}[97:65;6:2;65u',
		'\u{1B}[97:65:113;6:2;65u',
		'\u{1B}[97::113;6:2;65u',
	]) {
		t.assert.partialDeepStrictEqual(parseKeypress(sequence), {
			name: 'a',
			text: 'A',
			ctrl: true,
			shift: true,
			eventType: 'repeat',
			isKittyProtocol: true,
			sequence,
		});
	}

	t.assert.partialDeepStrictEqual(parseKeypress('\u{1B}[1092::97;5u'), {
		name: 'ф',
		text: 'ф',
		ctrl: true,
		shift: false,
		eventType: 'press',
		isKittyProtocol: true,
	});
});

test('kitty keypad associated text is printable input', (t: TestContext) => {
	for (const [sequence, name, text] of [
		['\u{1B}[57399;129;48u', 'kp0', '0'],
		['\u{1B}[57413;1;43u', 'kpadd', '+'],
	] as const) {
		const key = parseKeypress(sequence);

		t.assert.strictEqual(key.name, name);
		t.assert.strictEqual(key.text, text);
		t.assert.ok(key.isPrintable);
		t.assert.ok(key.isKittyProtocol);
	}
});

test('kitty keypad Enter produces a return key and carriage return text', (t: TestContext) => {
	for (const [sequence, shift, eventType] of [
		['\u{1B}[57414u', false, 'press'],
		['\u{1B}[57414;2:2u', true, 'repeat'],
	] as const) {
		const key = parseKeypress(sequence);

		t.assert.strictEqual(key.name, 'return');
		t.assert.strictEqual(key.text, '\r');
		t.assert.ok(key.isPrintable);
		t.assert.ok(key.isKittyProtocol);
		t.assert.strictEqual(key.sequence, sequence);
		t.assert.strictEqual(key.shift, shift);
		t.assert.strictEqual(key.eventType, eventType);
	}
});

test('application keypad Enter maps to Return with carriage return sequence', (t: TestContext) => {
	for (const [sequence, meta] of [
		['OM', false],
		['OM', true],
	] as const) {
		const key = parseKeypress(sequence);

		t.assert.strictEqual(key.name, 'return');
		t.assert.strictEqual(key.sequence, '\r');
		t.assert.strictEqual(key.raw, undefined);
		t.assert.strictEqual(key.meta, meta);
		t.assert.strictEqual(key.ctrl, false);
		t.assert.strictEqual(key.shift, false);
	}
});

test('Meta+Tab preserves the tab key and Meta modifier', (t: TestContext) => {
	const key = parseKeypress('\u{1B}\t');

	t.assert.strictEqual(key.name, 'tab');
	t.assert.ok(key.meta);
	t.assert.strictEqual(key.ctrl, false);
	t.assert.strictEqual(key.shift, false);
	t.assert.strictEqual(key.sequence, '\u{1B}\t');
});

test('Ctrl+Meta letters preserve both modifiers and the letter name', (t: TestContext) => {
	for (const [controlCharacter, name] of [
		['\u{2}', 'b'],
		['\u{6}', 'f'],
		['\u{18}', 'x'],
	]) {
		const sequence = `\u{1B}${controlCharacter}`;
		const key = parseKeypress(sequence);

		t.assert.strictEqual(key.name, name);
		t.assert.ok(key.ctrl);
		t.assert.ok(key.meta);
		t.assert.strictEqual(key.shift, false);
		t.assert.strictEqual(key.sequence, sequence);
	}
});

test('kitty associated text accepts an omitted modifier value', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[0;;229u');

	t.assert.ok(key.isKittyProtocol);
	t.assert.ok(key.isPrintable);
	t.assert.strictEqual(key.text, 'å');
	t.assert.strictEqual(key.eventType, 'press');
	t.assert.strictEqual(key.ctrl, false);
	t.assert.strictEqual(key.meta, false);
	t.assert.strictEqual(key.shift, false);
});

test('Meta modifier is recognized for punctuation and Unicode characters', (t: TestContext) => {
	for (const character of ['.', ',', '/', '-', 'é', '😀']) {
		const sequence = `\u{1B}${character}`;
		const key = parseKeypress(sequence);

		t.assert.ok(key.meta, `Meta modifier for ${character}`);
		t.assert.strictEqual(key.name, character);
		t.assert.strictEqual(key.sequence, sequence);
		t.assert.strictEqual(key.ctrl, false);
		t.assert.strictEqual(key.shift, false);
	}
});

test('incomplete and multi-character sequences are not Meta characters', (t: TestContext) => {
	for (const sequence of ['\u{1B}[', '\u{1B}[1;', '\u{1B}hello']) {
		t.assert.strictEqual(
			parseKeypress(sequence).meta,
			false,
			`Sequence ${sequence}`,
		);
	}
});

// Vt220-style Ctrl+F1–F4 (ESC [ 1 ; 5 P/Q/R/S)
test('Ctrl+F1 resolves to name "f1"', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[1;5P');
	t.assert.strictEqual(key.name, 'f1');
	t.assert.ok(key.ctrl);
	t.assert.strictEqual(key.shift, false);
	t.assert.strictEqual(key.meta, false);
});

test('Ctrl+F2 resolves to name "f2"', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[1;5Q');
	t.assert.strictEqual(key.name, 'f2');
	t.assert.ok(key.ctrl);
});

test('Ctrl+F3 resolves to name "f3"', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[1;5R');
	t.assert.strictEqual(key.name, 'f3');
	t.assert.ok(key.ctrl);
});

test('Ctrl+F4 resolves to name "f4"', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[1;5S');
	t.assert.strictEqual(key.name, 'f4');
	t.assert.ok(key.ctrl);
});

// Unmapped codes fall back to empty string
test('unmapped ctrl sequence returns empty name', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[1;5I');
	t.assert.strictEqual(key.name, '');
	t.assert.ok(key.ctrl);
});

test('another unmapped ctrl sequence returns empty name', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[1;5X');
	t.assert.strictEqual(key.name, '');
	t.assert.ok(key.ctrl);
});

// Shift+F1 (modifier 2) uses the same [P mapping
test('Shift+F1 resolves to name "f1" with shift', (t: TestContext) => {
	const key = parseKeypress('\u{1B}[1;2P');
	t.assert.strictEqual(key.name, 'f1');
	t.assert.ok(key.shift);
	t.assert.strictEqual(key.ctrl, false);
});

test('legacy function, editing, and rxvt modifier key sequences', (t: TestContext) => {
	for (const [code, name, shift, ctrl] of [
		['OP', 'f1', false, false],
		['OQ', 'f2', false, false],
		['OR', 'f3', false, false],
		['OS', 'f4', false, false],
		['[P', 'f1', false, false],
		['[Q', 'f2', false, false],
		['[R', 'f3', false, false],
		['[S', 'f4', false, false],
		['[11~', 'f1', false, false],
		['[12~', 'f2', false, false],
		['[13~', 'f3', false, false],
		['[14~', 'f4', false, false],
		['[[A', 'f1', false, false],
		['[[B', 'f2', false, false],
		['[[C', 'f3', false, false],
		['[[D', 'f4', false, false],
		['[[E', 'f5', false, false],
		['[15~', 'f5', false, false],
		['[17~', 'f6', false, false],
		['[18~', 'f7', false, false],
		['[19~', 'f8', false, false],
		['[20~', 'f9', false, false],
		['[21~', 'f10', false, false],
		['[23~', 'f11', false, false],
		['[24~', 'f12', false, false],
		['[A', 'up', false, false],
		['[B', 'down', false, false],
		['[C', 'right', false, false],
		['[D', 'left', false, false],
		['[E', 'clear', false, false],
		['[F', 'end', false, false],
		['[H', 'home', false, false],
		['OA', 'up', false, false],
		['OB', 'down', false, false],
		['OC', 'right', false, false],
		['OD', 'left', false, false],
		['OE', 'clear', false, false],
		['OF', 'end', false, false],
		['OH', 'home', false, false],
		['[1~', 'home', false, false],
		['[2~', 'insert', false, false],
		['[3~', 'delete', false, false],
		['[4~', 'end', false, false],
		['[5~', 'pageup', false, false],
		['[6~', 'pagedown', false, false],
		['[[5~', 'pageup', false, false],
		['[[6~', 'pagedown', false, false],
		['[7~', 'home', false, false],
		['[8~', 'end', false, false],
		['[a', 'up', true, false],
		['[b', 'down', true, false],
		['[c', 'right', true, false],
		['[d', 'left', true, false],
		['[e', 'clear', true, false],
		['[2$', 'insert', true, false],
		['[3$', 'delete', true, false],
		['[5$', 'pageup', true, false],
		['[6$', 'pagedown', true, false],
		['[7$', 'home', true, false],
		['[8$', 'end', true, false],
		['Oa', 'up', false, true],
		['Ob', 'down', false, true],
		['Oc', 'right', false, true],
		['Od', 'left', false, true],
		['Oe', 'clear', false, true],
		['[2^', 'insert', false, true],
		['[3^', 'delete', false, true],
		['[5^', 'pageup', false, true],
		['[6^', 'pagedown', false, true],
		['[7^', 'home', false, true],
		['[8^', 'end', false, true],
		['[Z', 'tab', true, false],
	] as const) {
		t.assert.partialDeepStrictEqual(
			parseKeypress(`\u{1B}${code}`),
			{name, shift, ctrl, meta: false},
			code,
		);
		// Plain `[N~` codes that the kitty special-key parser recognizes never reach the legacy table. A leading ESC adds Meta and resolves every code through the table, which `code` confirms.
		t.assert.partialDeepStrictEqual(
			parseKeypress(`\u{1B}\u{1B}${code}`),
			{name, shift, ctrl, meta: true, code},
			`Meta+${code}`,
		);
	}
});

test('legacy xterm modifier parameters set Meta and Ctrl', (t: TestContext) => {
	t.assert.partialDeepStrictEqual(parseKeypress('\u{1B}O1;9A'), {
		name: 'up',
		meta: true,
		ctrl: false,
		shift: false,
	});
	t.assert.partialDeepStrictEqual(parseKeypress('\u{1B}\u{1B}[2;5~'), {
		name: 'insert',
		meta: true,
		ctrl: true,
		shift: false,
	});
});
