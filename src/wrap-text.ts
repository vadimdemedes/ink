import wrapAnsi from 'wrap-ansi';
import cliTruncate from 'cli-truncate';
import stringWidth from 'string-width';
import {type Styles} from './styles.js';

const cache: Record<string, string> = {};

const wrapText = (
	text: string,
	maxWidth: number,
	wrapType: Styles['textWrap'],
): string => {
	const cacheKey = text + String(maxWidth) + String(wrapType);
	const cachedText = cache[cacheKey];

	if (cachedText) {
		return cachedText;
	}

	let wrappedText = text;

	if (wrapType === 'wrap') {
		wrappedText = wrapAnsi(text, maxWidth, {
			trim: false,
			hard: true,
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

		// Workaround: cli-truncate may produce output wider than maxWidth when wide
		// characters (e.g. CJK) fall on the slice boundary, because slice-ansi
		// rounds up to include the full character. Reduce maxWidth and retry until
		// it fits. See https://github.com/sindresorhus/cli-truncate/issues/28
		let adjustedMaxWidth = maxWidth;
		while (stringWidth(wrappedText) > maxWidth && adjustedMaxWidth > 1) {
			adjustedMaxWidth--;
			wrappedText = cliTruncate(text, adjustedMaxWidth, {position});
		}
	}

	cache[cacheKey] = wrappedText;

	return wrappedText;
};

export default wrapText;
