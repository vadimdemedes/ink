import test from 'ava';
import parseKeypress from '../src/parse-keypress.js';

test('kitty functional keys preserve modifiers without an explicit event type', t => {
	for (const [sequence, name] of [
		['\u001B[1;249A', 'up'],
		['\u001B[3;249~', 'delete'],
		['\u001B[13;249~', 'f3'],
		['\u001B[1;249P', 'f1'],
	] as const) {
		t.like(parseKeypress(sequence), {
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

	t.like(parseKeypress('\u001B[1;9A'), {super: true, meta: false});
});

test('kitty modifiers and event types agree across key encodings', t => {
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
				`\u001B[97;${modifiers}u`,
				`\u001B[1;${modifiers}A`,
				`\u001B[3;${modifiers}~`,
			]) {
				const key = parseKeypress(sequence);
				t.true(key[modifierName], `Sequence: ${sequence}`);
				t.is(key.eventType, eventType, `Sequence: ${sequence}`);
			}
		}
	}
});

test('kitty keypad Begin supports both functional encodings', t => {
	for (const sequence of [
		'\u001B[1E',
		'\u001B[57427~',
		'\u001B[1;1:2E',
		'\u001B[57427;1:2~',
	]) {
		t.is(parseKeypress(sequence).name, 'clear');
	}
});

test('kitty text-only events have no key identity', t => {
	t.like(parseKeypress('\u001B[0;;229:128169u'), {
		name: '',
		text: 'å💩',
		isPrintable: true,
	});
});

test('kitty unknown functional and control codes do not invent printable characters', t => {
	for (const codepoint of [0, 1, 3, 31, 128, 159, 57_344, 63_743]) {
		t.like(parseKeypress(`\u001B[${codepoint}u`), {
			name: '',
			isPrintable: false,
			text: undefined,
		});
	}

	t.like(parseKeypress('\u001B[63744u'), {
		text: String.fromCodePoint(63_744),
		isPrintable: true,
	});
});

test('legacy Ctrl+Space preserves the space key and modifiers', t => {
	for (const sequence of ['\u0000', '\u001B\u0000']) {
		t.like(parseKeypress(sequence), {
			name: 'space',
			ctrl: true,
			meta: sequence.length === 2,
			shift: false,
			sequence,
		});
	}
});

test('kitty keypad navigation keys use standard key names', t => {
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
		const sequence = `\u001B[${codepoint};5:2u`;
		t.like(parseKeypress(sequence), {
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

test('legacy Ctrl+punctuation shortcuts preserve the key and modifiers', t => {
	for (const [character, name] of [
		['\u001C', '\\'],
		['\u001D', ']'],
		['\u001E', '^'],
		['\u001F', '_'],
	]) {
		for (const prefix of ['', '\u001B']) {
			const sequence = prefix + character;
			t.like(parseKeypress(sequence), {
				name,
				ctrl: true,
				meta: prefix.length > 0,
				shift: false,
				sequence,
			});
		}
	}
});

test('kitty alternate key codes preserve the primary key event', t => {
	for (const sequence of [
		'\u001B[97:65;6:2;65u',
		'\u001B[97:65:113;6:2;65u',
		'\u001B[97::113;6:2;65u',
	]) {
		t.like(parseKeypress(sequence), {
			name: 'a',
			text: 'A',
			ctrl: true,
			shift: true,
			eventType: 'repeat',
			isKittyProtocol: true,
			sequence,
		});
	}

	t.like(parseKeypress('\u001B[1092::97;5u'), {
		name: 'ф',
		text: 'ф',
		ctrl: true,
		shift: false,
		eventType: 'press',
		isKittyProtocol: true,
	});
});

test('kitty keypad associated text is printable input', t => {
	for (const [sequence, name, text] of [
		['\u001B[57399;129;48u', 'kp0', '0'],
		['\u001B[57413;1;43u', 'kpadd', '+'],
	] as const) {
		const key = parseKeypress(sequence);

		t.is(key.name, name);
		t.is(key.text, text);
		t.true(key.isPrintable);
		t.true(key.isKittyProtocol);
	}
});

test('kitty keypad Enter produces a return key and carriage return text', t => {
	for (const [sequence, shift, eventType] of [
		['\u001B[57414u', false, 'press'],
		['\u001B[57414;2:2u', true, 'repeat'],
	] as const) {
		const key = parseKeypress(sequence);

		t.is(key.name, 'return');
		t.is(key.text, '\r');
		t.true(key.isPrintable);
		t.true(key.isKittyProtocol);
		t.is(key.sequence, sequence);
		t.is(key.shift, shift);
		t.is(key.eventType, eventType);
	}
});

test('Meta+Tab preserves the tab key and Meta modifier', t => {
	const key = parseKeypress('\u001B\t');

	t.is(key.name, 'tab');
	t.true(key.meta);
	t.false(key.ctrl);
	t.false(key.shift);
	t.is(key.sequence, '\u001B\t');
});

test('Ctrl+Meta letters preserve both modifiers and the letter name', t => {
	for (const [controlCharacter, name] of [
		['\u0002', 'b'],
		['\u0006', 'f'],
		['\u0018', 'x'],
	]) {
		const sequence = `\u001B${controlCharacter}`;
		const key = parseKeypress(sequence);

		t.is(key.name, name);
		t.true(key.ctrl);
		t.true(key.meta);
		t.false(key.shift);
		t.is(key.sequence, sequence);
	}
});

test('kitty associated text accepts an omitted modifier value', t => {
	const key = parseKeypress('\u001B[0;;229u');

	t.true(key.isKittyProtocol);
	t.true(key.isPrintable);
	t.is(key.text, 'å');
	t.is(key.eventType, 'press');
	t.false(key.ctrl);
	t.false(key.meta);
	t.false(key.shift);
});

test('Meta modifier is recognized for punctuation and Unicode characters', t => {
	for (const character of ['.', ',', '/', '-', 'é', '😀']) {
		const sequence = `\u001B${character}`;
		const key = parseKeypress(sequence);

		t.true(key.meta, `Meta modifier for ${character}`);
		t.is(key.name, character);
		t.is(key.sequence, sequence);
		t.false(key.ctrl);
		t.false(key.shift);
	}
});

test('incomplete and multi-character sequences are not Meta characters', t => {
	for (const sequence of ['\u001B[', '\u001B[1;', '\u001Bhello']) {
		t.false(parseKeypress(sequence).meta, `Sequence ${sequence}`);
	}
});

// Vt220-style Ctrl+F1–F4 (ESC [ 1 ; 5 P/Q/R/S)
test('Ctrl+F1 resolves to name "f1"', t => {
	const key = parseKeypress('\u001B[1;5P');
	t.is(key.name, 'f1');
	t.true(key.ctrl);
	t.false(key.shift);
	t.false(key.meta);
});

test('Ctrl+F2 resolves to name "f2"', t => {
	const key = parseKeypress('\u001B[1;5Q');
	t.is(key.name, 'f2');
	t.true(key.ctrl);
});

test('Ctrl+F3 resolves to name "f3"', t => {
	const key = parseKeypress('\u001B[1;5R');
	t.is(key.name, 'f3');
	t.true(key.ctrl);
});

test('Ctrl+F4 resolves to name "f4"', t => {
	const key = parseKeypress('\u001B[1;5S');
	t.is(key.name, 'f4');
	t.true(key.ctrl);
});

// Unmapped codes fall back to empty string
test('unmapped ctrl sequence returns empty name', t => {
	const key = parseKeypress('\u001B[1;5I');
	t.is(key.name, '');
	t.true(key.ctrl);
});

test('another unmapped ctrl sequence returns empty name', t => {
	const key = parseKeypress('\u001B[1;5X');
	t.is(key.name, '');
	t.true(key.ctrl);
});

// Shift+F1 (modifier 2) uses the same [P mapping
test('Shift+F1 resolves to name "f1" with shift', t => {
	const key = parseKeypress('\u001B[1;2P');
	t.is(key.name, 'f1');
	t.true(key.shift);
	t.false(key.ctrl);
});
