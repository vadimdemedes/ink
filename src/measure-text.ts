import widestLine from 'widest-line';

const cache: Record<string, Output> = {};

type Output = {
	width: number;
	height: number;
};

const measureText = (text: string): Output => {
	if (text.length === 0) {
		return {
			width: 0,
			height: 0,
		};
	}

	const cachedDimensions = cache[text];

	if (cachedDimensions) {
		return cachedDimensions;
	}

	const width = widestLine(text);
	const height = text.split('\n').length;
	cache[text] = {width, height};

	return {width, height};
};

export default measureText;
