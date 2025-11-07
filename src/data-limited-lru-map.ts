import {LRUMapWithDelete} from 'mnemonist';

type InternalLruMap<K> = {
	K: Array<K | undefined>;
	tail: number;
};

/**
 * A specialized LRU map that enforces limits on both the number of entries and
 * the total character length of the keys.
 *
 * When adding a new item, if the new key's length would exceed `maxDataSize`,
 * it evicts the least recently used items until space is available.
 *
 * @template V - The type of the values stored in the map.
 */
export class DataLimitedLruMap<V> {
	private readonly map: LRUMapWithDelete<string, V>;
	private readonly maxDataSize: number;
	private currentDataSize = 0;

	constructor(maxKeys: number, maxDataSize: number) {
		this.map = new LRUMapWithDelete<string, V>(maxKeys);
		this.maxDataSize = maxDataSize;
	}

	get(key: string): V | undefined {
		return this.map.get(key);
	}

	set(key: string, value: V): void {
		const size = key.length;
		const hasKey = this.map.has(key);

		while (
			this.currentDataSize + size > this.maxDataSize &&
			this.map.size > 0
		) {
			const map = this.map as unknown as InternalLruMap<string>;
			const lruKey = map.K[map.tail];

			if (lruKey === undefined) {
				break;
			}

			this.currentDataSize -= lruKey.length;

			this.map.delete(lruKey);
		}

		const result = this.map.setpop(key, value) as
			| {evicted: boolean; key: string; value: V}
			| undefined;

		if (result?.evicted) {
			this.currentDataSize -= result.key.length;
		}

		if (hasKey) {
			this.currentDataSize -= size;
		}

		this.currentDataSize += size;
	}

	get size(): number {
		return this.map.size;
	}

	get currentDataSizeValue(): number {
		return this.currentDataSize;
	}
}
