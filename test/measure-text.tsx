import test, {type TestContext} from 'node:test';
import measureText from '../src/measure-text.js';

test('measure single word', (t: TestContext) => {
	t.assert.deepStrictEqual(measureText('constructor'), {width: 11, height: 1});
});

test('measure empty string', (t: TestContext) => {
	t.assert.deepStrictEqual(measureText(''), {width: 0, height: 0});
});

test('measure multiline text', (t: TestContext) => {
	const result = measureText('hello\nworld');
	t.assert.strictEqual(result.width, 5);
	t.assert.strictEqual(result.height, 2);
});

test('measure multiline text with varying line lengths', (t: TestContext) => {
	const result = measureText('a\nfoo\nhi');
	t.assert.strictEqual(result.width, 3);
	t.assert.strictEqual(result.height, 3);
});

test('measure text with trailing newline', (t: TestContext) => {
	const result = measureText('hello\n');
	t.assert.strictEqual(result.width, 5);
	t.assert.strictEqual(result.height, 2);
});

test('measure text with only newlines', (t: TestContext) => {
	const result = measureText('\n\n');
	t.assert.strictEqual(result.width, 0);
	t.assert.strictEqual(result.height, 3);
});

test('returns cached result on repeated calls', (t: TestContext) => {
	const first = measureText('cached-test');
	t.assert.strictEqual(first.width, 11);
	t.assert.strictEqual(first.height, 1);
	const second = measureText('cached-test');
	t.assert.strictEqual(first, second);
});

test('evicts old cached results', (t: TestContext) => {
	const first = measureText('eviction-test-first');

	for (let index = 0; index < 8192; index++) {
		measureText(`eviction-test-${index}`);
	}

	const second = measureText('eviction-test-first');
	t.assert.notStrictEqual(first, second);
});

test('measure text with ANSI escape sequences', (t: TestContext) => {
	const result = measureText('\u{1B}[31mred\u{1B}[0m');
	t.assert.strictEqual(result.width, 3);
	t.assert.strictEqual(result.height, 1);
});

test('measure text with 256-color ANSI', (t: TestContext) => {
	const result = measureText('\u{1B}[38;5;196mred\u{1B}[0m');
	t.assert.strictEqual(result.width, 3);
	t.assert.strictEqual(result.height, 1);
});

test('measure text with wide characters', (t: TestContext) => {
	const result = measureText('你好');
	t.assert.strictEqual(result.width, 4);
	t.assert.strictEqual(result.height, 1);
});

test('measure text with emoji', (t: TestContext) => {
	const result = measureText('🍔');
	t.assert.strictEqual(result.width, 2);
	t.assert.strictEqual(result.height, 1);
});

test('measure multiline with wide characters', (t: TestContext) => {
	const result = measureText('🍔🍟\nabc');
	t.assert.strictEqual(result.width, 4);
	t.assert.strictEqual(result.height, 2);
});
