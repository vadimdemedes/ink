import widestLine from 'widest-line';

export const measureText = (text: string) => {
	const width = widestLine(text);
	const height = text.split('\n').length;

	return {width, height};
};
