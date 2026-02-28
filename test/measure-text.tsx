import test from 'ava';
import measureText from '../src/measure-text.js';

test('measure single word', t => {
	const result = measureText('constructor');
	t.is(result.width, 11);
	t.is(result.height, 1);
});

test('measure empty string', t => {
	const result = measureText('');
	t.is(result.width, 0);
	t.is(result.height, 0);
});

test('measure single character', t => {
	const result = measureText('x');
	t.is(result.width, 1);
	t.is(result.height, 1);
});

test('measure multiline text', t => {
	const result = measureText('hello\nworld');
	t.is(result.width, 5);
	t.is(result.height, 2);
});

test('measure multiline text with varying line lengths', t => {
	const result = measureText('a\nfoo\nhi');
	t.is(result.width, 3);
	t.is(result.height, 3);
});

test('measure text with trailing newline', t => {
	const result = measureText('hello\n');
	t.is(result.width, 5);
	t.is(result.height, 2);
});

test('measure text with only newlines', t => {
	const result = measureText('\n\n');
	t.is(result.width, 0);
	t.is(result.height, 3);
});

test('returns cached result on repeated calls', t => {
	const first = measureText('cached-test');
	const second = measureText('cached-test');
	t.is(first, second);
});

test('measure text with ANSI escape sequences', t => {
	// ANSI codes should not count toward width
	const result = measureText('\u001B[31mred\u001B[0m');
	t.is(result.width, 3);
	t.is(result.height, 1);
});

test('measure text with wide characters', t => {
	// CJK characters are 2 columns wide
	const result = measureText('你好');
	t.is(result.width, 4);
	t.is(result.height, 1);
});

test('measure text with emoji', t => {
	const result = measureText('🍔');
	t.is(result.width, 2);
	t.is(result.height, 1);
});

test('measure multiline with wide characters', t => {
	const result = measureText('🍔🍟\nabc');
	t.is(result.width, 4);
	t.is(result.height, 2);
});
