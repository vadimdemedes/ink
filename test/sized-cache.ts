import test, {type TestContext} from 'node:test';
import SizedCache from '../src/sized-cache.js';

// With a max size of 16, generations rotate at 8 and entries above 2 are refused.
const createCache = () => new SizedCache<string, number>(16);

test('returns stored values', (t: TestContext) => {
	const cache = createCache();
	cache.set('a', 1, 1);
	t.assert.strictEqual(cache.get('a'), 1);
	t.assert.strictEqual(cache.get('b'), undefined);
});

test('keeps entries from the previous generation and promotes them on read', (t: TestContext) => {
	const cache = createCache();
	cache.set('kept', 1, 2);
	cache.set('filler-1', 2, 2);
	cache.set('filler-2', 3, 2);
	cache.set('filler-3', 4, 2); // Rotates: everything above is now previous.

	t.assert.strictEqual(cache.get('kept'), 1);

	// Fill and rotate again. Only the promoted entry survives.
	cache.set('filler-4', 5, 2);
	cache.set('filler-5', 6, 2);
	cache.set('filler-6', 7, 2);
	t.assert.strictEqual(cache.get('kept'), 1);
	t.assert.strictEqual(cache.get('filler-1'), undefined);
});

test('evicts entries after two rotations without reads', (t: TestContext) => {
	const cache = createCache();
	cache.set('first', 1, 2);
	for (let index = 0; index < 8; index++) {
		cache.set(`filler-${index}`, index, 2);
	}

	t.assert.strictEqual(cache.get('first'), undefined);
});

test('refuses entries larger than an eighth of the max size', (t: TestContext) => {
	const cache = createCache();
	cache.set('small', 1, 1);
	cache.set('large', 2, 3);
	t.assert.strictEqual(cache.get('large'), undefined);
	t.assert.strictEqual(cache.get('small'), 1);
});

test('replacing a key does not count its old size', (t: TestContext) => {
	const cache = createCache();
	cache.set('kept', 1, 2);
	for (let index = 0; index < 10; index++) {
		cache.set('replaced', index, 2);
	}

	// Counting every replacement would have rotated twice and dropped `kept`.
	t.assert.strictEqual(cache.get('kept'), 1);
	t.assert.strictEqual(cache.get('replaced'), 9);
});

test('reports and clears entries from both generations', (t: TestContext) => {
	const cache = createCache();
	cache.set('previous', 1, 2);
	cache.set('filler-1', 2, 2);
	cache.set('filler-2', 3, 2);
	cache.set('filler-3', 4, 2);
	cache.set('current', 5, 2);

	t.assert.strictEqual(cache.has('previous'), true);
	t.assert.strictEqual(cache.has('current'), true);
	t.assert.strictEqual(cache.has('missing'), false);

	cache.clear();
	t.assert.strictEqual(cache.has('previous'), false);
	t.assert.strictEqual(cache.has('current'), false);
});
