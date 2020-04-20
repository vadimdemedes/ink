import widestLine from 'widest-line';

const cache: Record<string, Output> = {};

interface Output {
	width: number;
	height: number;
}

export const measureText = (text: string): Output => {
	if (text.length === 0) {
		return {
			width: 0,
			height: 0
		};
	}

	if (cache[text]) {
		return cache[text];
	}

	const width = widestLine(text);
	const height = text.split('\n').length;
	cache[text] = {width, height};

	return {width, height};
};
