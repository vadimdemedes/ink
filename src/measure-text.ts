import widestLine from 'widest-line';

interface Output {
	width: number;
	height: number;
}

export const measureText = (text: string): Output => {
	const width = widestLine(text);
	const height = text.split('\n').length;

	return {width, height};
};
