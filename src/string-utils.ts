import {stripVTControlCharacters} from 'node:util';
import {lengthOf, take} from './iterable-utils.js';

const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});

/**
 Create an Iterator over grapheme segments in `text`
 */
export const iterateGraphemeSegments = (text: string) =>
	segmenter.segment(text);

export const countNonAnsiGraphemes = (text: string) =>
	lengthOf(iterateGraphemeSegments(stripVTControlCharacters(text)));

export const graphemeOffsetToByteOffset = (
	text: string,
	graphemeOffset: number,
) => {
	if (graphemeOffset === 0) {
		return 0;
	}

	let byteOffset = 0;
	for (const {segment} of take(
		iterateGraphemeSegments(text),
		graphemeOffset - 1,
	)) {
		byteOffset += segment.length;
	}

	return byteOffset;
};
