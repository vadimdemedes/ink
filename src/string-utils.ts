import {stripVTControlCharacters} from 'node:util';
import {lengthOf, take} from './iterable-utils.js';
import {iterateAnsiTokens} from './ansi-tokenizer.js';

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
		return {byteOffset: 0};
	}

	let byteOffset = 0;
	let consumed = 0;
	for (const {segment} of take(
		iterateGraphemeSegments(text),
		graphemeOffset - 1,
	)) {
		++consumed;
		byteOffset += segment.length;
	}

	return consumed < graphemeOffset
		? // The offset does not exist in `text`
			{graphemeOffsetsSeen: consumed - 1}
		: {byteOffset};
};

export function* iterateAnsiGraphemes(text: string) {
	for (const {index, token} of iterateAnsiTokens(text)) {
		if (token.type === 'text') {
			for (const segment of iterateGraphemeSegments(token.value)) {
				yield {
					index: index + segment.index,
					token: {
						type: 'grapheme' as const,
						value: segment.segment,
					},
				};
			}
		} else {
			yield {index, token};
		}
	}
}
