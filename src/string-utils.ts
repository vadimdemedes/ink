import {tokenizeAnsi} from './ansi-tokenizer.js';

const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});

/**
 Create an Iterator over grapheme segments in `text`
 */
export const iterateGraphemeSegments = (text: string) =>
	segmenter.segment(text);

export function* iterateAnsiGraphemes(text: string) {
	let offset = 0;
	for (const token of tokenizeAnsi(text)) {
		// The tokenizer drops lone ESC characters, so tokens are not always contiguous.
		if (!text.startsWith(token.value, offset)) {
			offset = text.indexOf(token.value, offset);
		}

		const index = offset;
		offset += token.value.length;

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
