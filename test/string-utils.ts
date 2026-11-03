import test, {type TestContext} from 'node:test';
import {iterateAnsiGraphemes} from '../src/string-utils.js';

const assertIndices = (t: TestContext, text: string) => {
	const items = [...iterateAnsiGraphemes(text)];

	for (const {index, token} of items) {
		t.assert.ok(
			text.startsWith(token.value, index),
			`token ${JSON.stringify(token.value)} not found at index ${index}`,
		);
	}

	return items;
};

test('iterateAnsiGraphemes indexes plain text', (t: TestContext) => {
	const items = assertIndices(t, 'abc');

	t.assert.deepStrictEqual(
		items.map(({index}) => index),
		[0, 1, 2],
	);
});

test('iterateAnsiGraphemes indexes text around CSI sequences', (t: TestContext) => {
	const items = assertIndices(t, 'a\u{1B}[31mbc\u{1B}[0md');

	t.assert.deepStrictEqual(
		items.map(({index, token}) => [index, token.type]),
		[
			[0, 'grapheme'],
			[1, 'csi'],
			[6, 'grapheme'],
			[7, 'grapheme'],
			[8, 'csi'],
			[12, 'grapheme'],
		],
	);
});

test('iterateAnsiGraphemes indexes multi-codepoint graphemes', (t: TestContext) => {
	const text = 'a👨‍👩‍👧e\u{301}b';
	const items = assertIndices(t, text);

	t.assert.deepStrictEqual(
		items.map(({token}) => token.value),
		['a', '👨‍👩‍👧', 'e\u{301}', 'b'],
	);
	t.assert.deepStrictEqual(
		items.map(({index}) => index),
		[0, 1, 9, 11],
	);
});

test('iterateAnsiGraphemes indexes past a dropped lone ESC', (t: TestContext) => {
	const items = assertIndices(t, 'a\u{1B}\u{7}b\u{1B}\u{7}\u{1B}[1mc');

	t.assert.deepStrictEqual(
		items.map(({index, token}) => [index, token.value]),
		[
			[0, 'a'],
			[2, '\u{7}'],
			[3, 'b'],
			[5, '\u{7}'],
			[6, '\u{1B}[1m'],
			[10, 'c'],
		],
	);
});
