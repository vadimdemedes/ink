import widestLine from 'widest-line';

export default text => {
	const width = widestLine(text);
	const height = text.split('\n').length;

	return {width, height};
};
