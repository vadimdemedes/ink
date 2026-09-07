import wrapAnsi from 'wrap-ansi';
import cliTruncate from 'cli-truncate';
import QuickLRU from 'quick-lru';
import {type Styles} from './styles.js';

export const wrapTextCache = new QuickLRU<string, string>({maxSize: 4096});

const wrapText = (
	text: string,
	maxWidth: number,
	wrapType: Styles['textWrap'],
): string => {
	// `text` goes last because it's the only part of the key that can contain
	// arbitrary characters. With it first, ('ab', 12, 'wrap') and
	// ('ab1', 2, 'wrap') both produce the key `ab12wrap` and share a result.
	const cacheKey = `${maxWidth}\u0000${String(wrapType)}\u0000${text}`;
	const cachedText = wrapTextCache.get(cacheKey);

	if (cachedText !== undefined) {
		return cachedText;
	}

	let wrappedText = text;

	if (wrapType === 'wrap') {
		wrappedText = wrapAnsi(text, maxWidth, {
			trim: false,
			hard: true,
		});
	}

	if (wrapType === 'hard') {
		wrappedText = wrapAnsi(text, maxWidth, {
			trim: false,
			hard: true,
			wordWrap: false,
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

	wrapTextCache.set(cacheKey, wrappedText);

	return wrappedText;
};

export default wrapText;
