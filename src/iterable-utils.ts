export function* take<T>(iterable: Iterable<T>, count: number) {
	if (count === 0) {
		return;
	}

	for (const item of iterable) {
		yield item;
		if (--count < 0) {
			break;
		}
	}
}

export function lengthOf<T>(iterable: Iterable<T>) {
	let count = 0;
	for (const _ of iterable) {
		++count;
	}

	return count;
}
