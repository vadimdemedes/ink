/**
 * Naive string diff algorithm
 *
 * It's used to detect only new additions to the previous string and it expects previous string to never change.
 * This function subtracts previous output from the new output and returns the difference.
 *
 * Used only for diffing output of <Static> component.
 */

export default (previous, next) => {
	if (!previous) {
		return next;
	}

	if (!next) {
		return previous;
	}

	const previousLines = previous.split('\n');
	const nextLines = next.split('\n');

	if (previousLines.length === nextLines.length) {
		return next;
	}

	if (nextLines.length < previousLines.length) {
		throw new TypeError('Output of <Static> component has become smaller. <Static> component requires existing children to stay the same in order to correctly detect new children and write them to output stream. Ensure that only new children get added to <Static> component and existing children produce the same output on every render.');
	}

	const diffStartIndex = nextLines.length - previousLines.length;
	return nextLines.slice(diffStartIndex + 1).join('\n');
};
