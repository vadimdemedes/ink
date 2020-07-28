import wrapAnsi = require('wrap-ansi');
import cliTruncate = require('cli-truncate');
import type {Styles} from './styles';

const cache: Record<string, string> = {};

export default (
	text: string,
	maxWidth: number,
	wrapType: Styles['textWrap']
): string => {
	const cacheKey = text + String(maxWidth) + String(wrapType);

	if (cache[cacheKey]) {
		return cache[cacheKey];
	}

	let wrappedText = text;

	if (wrapType === 'wrap') {
		wrappedText = wrapAnsi(text, maxWidth, {
			trim: false,
			hard: true
		});
	}

	if (wrapType!.startsWith('truncate')) {
		let position: 'end' | 'middle' | 'start' = 'end';

		if (wrapType === 'truncate-middle') {
			position = 'middle';
		}

		if (wrapType === 'truncate-start') {
			position = 'start';
		}

		wrappedText = cliTruncate(text, maxWidth, {position});
	}

	cache[cacheKey] = wrappedText;

	return wrappedText;
};
