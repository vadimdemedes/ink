import test from 'ava';
import {DataLimitedLruMap} from '../src/data-limited-lru-map.js';

test('DataLimitedLruMap respects max keys limit', t => {
	const map = new DataLimitedLruMap<{foo: string}>(2, 100);
	map.set('a', {foo: 'bar'});
	map.set('b', {foo: 'bar'});
	t.is(map.size, 2);

	map.set('c', {foo: 'bar'});
	t.is(map.size, 2);
	t.is(map.get('a'), undefined);
	t.deepEqual(map.get('b'), {foo: 'bar'});
	t.deepEqual(map.get('c'), {foo: 'bar'});
});

test('DataLimitedLruMap respects max data size limit', t => {
	const map = new DataLimitedLruMap<{foo: string}>(10, 5);
	map.set('aa', {foo: 'bar'}); // Size 2
	map.set('bb', {foo: 'bar'}); // Size 2
	t.is(map.size, 2);
	t.is(map.currentDataSizeValue, 4);

	map.set('cc', {foo: 'bar'}); // Size 2
	// Should evict 'aa' (size 2) to make room for 'cc' (size 2). Total size: 4.
	t.is(map.size, 2);
	t.is(map.currentDataSizeValue, 4);
	t.is(map.get('aa'), undefined);
	t.deepEqual(map.get('bb'), {foo: 'bar'});
	t.deepEqual(map.get('cc'), {foo: 'bar'});
});

test('DataLimitedLruMap handles eviction by setpop correctly', t => {
	const map = new DataLimitedLruMap<{foo: string}>(2, 10);
	map.set('aa', {foo: 'bar'}); // Size 2
	map.set('bb', {foo: 'bar'}); // Size 2
	t.is(map.currentDataSizeValue, 4);

	map.set('ccc', {foo: 'bar'}); // Size 3
	// 'aa' evicted by setpop (count limit).
	t.is(map.size, 2);
	t.is(map.currentDataSizeValue, 5); // 4 - 2 + 3 = 5
	t.is(map.get('aa'), undefined);
	t.deepEqual(map.get('bb'), {foo: 'bar'});
	t.deepEqual(map.get('ccc'), {foo: 'bar'});
});

test('DataLimitedLruMap handles large item eviction', t => {
	const map = new DataLimitedLruMap<{foo: string}>(10, 10);
	map.set('aa', {foo: 'bar'}); // Size 2
	map.set('bb', {foo: 'bar'}); // Size 2
	map.set('cc', {foo: 'bar'}); // Size 2
	t.is(map.size, 3);
	t.is(map.currentDataSizeValue, 6);

	map.set('ddddddd', {foo: 'bar'}); // Size 7
	// Needs 7 space. Current free: 4. Needs to evict 3.
	// Evicts 'aa' (2). Free: 6. Still need 1.
	// Evicts 'bb' (2). Free: 8. OK.
	t.is(map.size, 2); // 'cc', 'ddddddd'
	t.is(map.currentDataSizeValue, 9); // 2 + 7
	t.is(map.get('aa'), undefined);
	t.is(map.get('bb'), undefined);
	t.deepEqual(map.get('cc'), {foo: 'bar'});
	t.deepEqual(map.get('ddddddd'), {foo: 'bar'});
});

test('DataLimitedLruMap handles item larger than max size', t => {
	const map = new DataLimitedLruMap<{foo: string}>(10, 5);
	map.set('aa', {foo: 'bar'}); // Size 2

	map.set('bbbbbb', {foo: 'bar'}); // Size 6
	// Should evict everything and still set 'bbbbbb' (even though it exceeds limit, standard LRU behavior usually allows it or rejects it.
	// Our implementation: loop evicts everything. Then sets 'bbbbbb'.
	// currentDataSize will be 6.
	t.is(map.size, 1);
	t.is(map.currentDataSizeValue, 6);
	t.deepEqual(map.get('bbbbbb'), {foo: 'bar'});
});

test('DataLimitedLruMap correctly updates size when overwriting existing key', t => {
	const map = new DataLimitedLruMap<{foo: string}>(10, 10);
	map.set('a', {foo: 'bar'}); // Size 1
	t.is(map.currentDataSizeValue, 1);

	map.set('a', {foo: 'baz'}); // Size 1, overwrite
	t.is(map.size, 1);
	t.is(map.currentDataSizeValue, 1);
	t.deepEqual(map.get('a'), {foo: 'baz'});
});
