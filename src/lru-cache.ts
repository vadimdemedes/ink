// A tiny bounded LRU cache.
//
// measureText() and wrapText() keep module-level caches that previously had no
// eviction, so every distinct string an app ever rendered was retained for the
// lifetime of the process — a streaming/typing indicator, a growing log or a
// clock leaked monotonically until OOM (#986). Capping the caches bounds memory
// while keeping recently-used entries hot.
export class LruCache<K, V> {
	private readonly cache = new Map<K, V>();
	private readonly maxSize: number;

	constructor(maxSize: number) {
		this.maxSize = maxSize;
	}

	get(key: K): V | undefined {
		if (!this.cache.has(key)) {
			return undefined;
		}

		const value = this.cache.get(key) as V;
		// Re-insert so the entry becomes the most recently used.
		this.cache.delete(key);
		this.cache.set(key, value);
		return value;
	}

	set(key: K, value: V): void {
		if (this.cache.size >= this.maxSize) {
			// Map iterates in insertion order; the first key is least recently used.
			this.cache.delete(this.cache.keys().next().value as K);
		}

		this.cache.set(key, value);
	}
}
