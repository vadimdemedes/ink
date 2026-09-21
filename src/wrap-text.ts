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
	// `wrapAnsi` only breaks a row once something is on it, so wrapping into zero columns puts every character on its own row and the layout height grows to the character count. Text with no room keeps its natural width instead, like any other content that does not fit. Truncation is left alone: it cuts to nothing at zero columns.
	if (maxWidth <= 0 && (wrapType === 'wrap' || wrapType === 'hard')) {
		return text;
	}

	// Yoga rounds a text node's width up to a whole column, so a positive fraction of a column is measured as the one column it renders into.
	if (maxWidth > 0 && maxWidth < 1) {
		maxWidth = 1;
	}

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

		// `cliTruncate` treats its input as a single line: newlines are zero-width, so the widths of every line would add up and the text would be cut as one run. Truncate each line on its own instead, the same way `wrapAnsi` wraps each line. Split on styled characters rather than the raw string so styles and links that span a newline are reopened on every line they cover. Single-line text skips the tokenization, which is the expensive part on long strings.
		let lines = [text];

		if (text.includes('\n')) {
			const styledLines: StyledChar[][] = [[]];
			for (const character of styledCharsFromTokens(tokenize(text))) {
				if (character.value === '\n') {
					styledLines.push([]);
				} else {
					styledLines.at(-1)!.push(character);
				}
			}

			lines = styledLines.map(line => styledCharsToString(line));
		}

		wrappedText = lines
			.map(line => cliTruncate(line, maxWidth, {position}))
			.join('\n');
	}

	wrapTextCache.set(cacheKey, wrappedText);

	return wrappedText;
};

export default wrapText;
