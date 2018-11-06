export default (previous, next) => {
	if (!previous) {
		return next;
	}

	if (!next) {
		return previous;
	}

	const previousLines = previous.split('\n');
	const nextLines = next.split('\n');

	const lineCount = Math.max(previousLines.length, nextLines.length);
	const diff = [];

	for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
		if (previousLines[lineIndex] !== nextLines[lineIndex]) {
			diff.push(nextLines[lineIndex]);
		}
	}

	return diff.join('\n');
};
