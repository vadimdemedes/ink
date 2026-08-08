import test from 'ava';
import {LruCache} from '../src/lru-cache.js';

test('evicts the least recently used entry when the cap is reached', t => {
	const cache = new LruCache<string, number>(2);

	cache.set('a', 1);
	cache.set('b', 2);
	// 'a' is now the least recently used.
	cache.set('c', 3);

	t.is(cache.get('a'), undefined);
	t.is(cache.get('b'), 2);
	t.is(cache.get('c'), 3);
});

test('refreshes recency on read so frequently-used entries are retained', t => {
	const cache = new LruCache<string, number>(2);

	cache.set('a', 1);
	cache.set('b', 2);
	// Reading 'a' makes it the most recently used, so 'b' becomes the victim.
	t.is(cache.get('a'), 1);
	cache.set('c', 3);

	t.is(cache.get('a'), 1);
	t.is(cache.get('b'), undefined);
	t.is(cache.get('c'), 3);
});

test('returns undefined for a missing key without affecting recency', t => {
	const cache = new LruCache<string, number>(2);

	cache.set('a', 1);
	cache.set('b', 2);
	t.is(cache.get('missing'), undefined);
	// 'a' is still the least recently used.
	cache.set('c', 3);

	t.is(cache.get('a'), undefined);
	t.is(cache.get('b'), 2);
});
