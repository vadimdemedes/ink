import widestLine from 'widest-line';
import SizedCache from './sized-cache.js';

// Sized by UTF-16 code units of the text.
const cache = new SizedCache<string, Output>(2 ** 20);

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

	const cachedDimensions = cache.get(text);

	if (cachedDimensions) {
		return cachedDimensions;
	}

	const width = widestLine(text);
	const height = text.split('\n').length;
	const dimensions = {width, height};
	cache.set(text, dimensions, text.length);

	return dimensions;
};

export default measureText;
