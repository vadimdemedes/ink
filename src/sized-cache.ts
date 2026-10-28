type SizedEntry<Value> = {value: Value; size: number};

/**
Cache bounded by the total size of its entries rather than just their count.
Behaves like quick-lru (two generations), but keeps memory usage stable when entry sizes vary widely, such as when keys are whole blocks of text.
Callers choose the unit of `size`, e.g. UTF-16 code units for string keys.
Only `size` counts toward the budget. Each entry also costs about 80 bytes for its Map slot, wrapper and key, which only adds up for caches of many tiny entries. Counting it would make those caches drop entries that are still in use.
*/
export default class SizedCache<Key, Value> {
	private current = new Map<Key, SizedEntry<Value>>();
	private previous = new Map<Key, SizedEntry<Value>>();
	private currentSize = 0;
	private readonly maxSize: number;

	constructor(maxSize: number) {
		this.maxSize = maxSize;
	}

	private add(key: Key, entry: SizedEntry<Value>): void {
		this.current.set(key, entry);
		this.currentSize += entry.size;
		if (this.currentSize < this.maxSize / 2) {
			return;
		}

		this.previous = this.current;
		this.current = new Map();
		this.currentSize = 0;
	}

	get(key: Key): Value | undefined {
		const entry = this.current.get(key);
		if (entry !== undefined) {
			return entry.value;
		}

		const old = this.previous.get(key);
		if (old === undefined) {
			return undefined;
		}

		this.previous.delete(key);
		this.add(key, old);
		return old.value;
	}

	has(key: Key): boolean {
		return this.current.has(key) || this.previous.has(key);
	}

	set(key: Key, value: Value, size: number): void {
		// Don't let one large entry drop everything else.
		if (size > this.maxSize / 8) {
			return;
		}

		this.previous.delete(key);
		const existing = this.current.get(key);
		if (existing !== undefined) {
			this.currentSize -= existing.size;
		}

		this.add(key, {value, size});
	}

	clear(): void {
		this.current.clear();
		this.previous.clear();
		this.currentSize = 0;
	}
}
