import wrapAnsi from 'wrap-ansi';
import cliTruncate from 'cli-truncate';
import {
	type StyledChar,
	styledCharsFromTokens,
	styledCharsToString,
	tokenize,
} from '@alcalzone/ansi-tokenize';
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

		// `cliTruncate` treats its input as a single line: newlines are zero-width, so the widths of every line would add up and the text would be cut as one run. Truncate each line on its own instead, the same way `wrapAnsi` wraps each line. Split on styled characters rather than the raw string so styles and links that span a newline are reopened on every line they cover.
		const lines: StyledChar[][] = [[]];
		for (const character of styledCharsFromTokens(tokenize(text))) {
			if (character.value === '\n') {
				lines.push([]);
			} else {
				lines.at(-1)!.push(character);
			}
		}

		wrappedText = lines
			.map(line => cliTruncate(styledCharsToString(line), maxWidth, {position}))
			.join('\n');
	}

	wrapTextCache.set(cacheKey, wrappedText);

	return wrappedText;
};

export default wrapText;
