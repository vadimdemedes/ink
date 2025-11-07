import stringWidth from 'string-width';
import {
	tokenize,
	styledCharsFromTokens,
	type StyledChar,
} from '@alcalzone/ansi-tokenize';
import {DataLimitedLruMap} from './data-limited-lru-map.js';

export type StringWidth = (text: string) => number;

const defaultStringWidth: StringWidth = stringWidth;

let currentStringWidth: StringWidth = defaultStringWidth;

// This cache must be cleared each time the string width function is changed.
// The strings passed as input are single characters so there is no need to
// limit the size of the cache as there are only a limited number of valid
// characters.
const widthCache = new Map<string, number>();

// This cache can persist for the lifetime of the application.
// The keys for this cache can be very large so we need to limit the size
// of the data cached as well as the number of keys cached to prevent
// memory issues.
const toStyledCharactersCache = new DataLimitedLruMap<StyledChar[]>(
	10_000,
	1_000_000,
);

export function setStringWidthFunction(fn: StringWidth) {
	currentStringWidth = fn;
	// Clear the width cache to avoid stale values.
	clearStringWidthCache();
}

export function clearStringWidthCache() {
	widthCache.clear();
}

export function toStyledCharacters(text: string): StyledChar[] {
	const cached = toStyledCharactersCache.get(text);
	if (cached !== undefined) {
		return cached;
	}

	const tokens = tokenize(text);
	const characters = styledCharsFromTokens(tokens);
	const combinedCharacters: StyledChar[] = [];

	for (let i = 0; i < characters.length; i++) {
		const character = characters[i];
		if (!character) {
			continue;
		}

		if (character.value === '\t') {
			const spaceCharacter: StyledChar = {...character, value: ' '};

			combinedCharacters.push(
				spaceCharacter,
				spaceCharacter,
				spaceCharacter,
				spaceCharacter,
			);
			continue;
		}

		if (character.value === '\b') {
			continue;
		}

		let {value} = character;
		let isCombined = false;
		const firstCodePoint = value.codePointAt(0);

		// 1. Regional Indicators (Flags)
		// These combine in pairs.
		// See: https://en.wikipedia.org/wiki/Regional_indicator_symbol
		if (
			firstCodePoint &&
			firstCodePoint >= 0x1_f1_e6 &&
			firstCodePoint <= 0x1_f1_ff &&
			i + 1 < characters.length
		) {
			const nextCharacter = characters[i + 1];

			if (nextCharacter) {
				const nextFirstCodePoint = nextCharacter.value.codePointAt(0);

				if (
					nextFirstCodePoint &&
					nextFirstCodePoint >= 0x1_f1_e6 &&
					nextFirstCodePoint <= 0x1_f1_ff
				) {
					value += nextCharacter.value;
					i++;

					combinedCharacters.push({...character, value});
					continue;
				}
			}
		}

		// 2. Other combining characters
		// See: https://en.wikipedia.org/wiki/Combining_character
		while (i + 1 < characters.length) {
			const nextCharacter = characters[i + 1];

			if (!nextCharacter) {
				break;
			}

			const codePoints = [...nextCharacter.value].map(char =>
				char.codePointAt(0),
			);

			const nextFirstCodePoint = codePoints[0];

			if (!nextFirstCodePoint) {
				break;
			}

			// Variation selectors
			const isVariationSelector =
				nextFirstCodePoint >= 0xfe_00 && nextFirstCodePoint <= 0xfe_0f;

			// Skin tone modifiers
			const isSkinToneModifier =
				nextFirstCodePoint >= 0x1_f3_fb && nextFirstCodePoint <= 0x1_f3_ff;

			const isZeroWidthJoiner = nextFirstCodePoint === 0x20_0d;
			const isKeycap = nextFirstCodePoint === 0x20_e3;

			// Tags block (U+E0000 - U+E007F)
			const isTagsBlock =
				nextFirstCodePoint >= 0xe_00_00 && nextFirstCodePoint <= 0xe_00_7f;

			// Combining Diacritical Marks
			const isCombiningMark =
				nextFirstCodePoint >= 0x03_00 && nextFirstCodePoint <= 0x03_6f;

			const isCombining =
				isVariationSelector ||
				isSkinToneModifier ||
				isZeroWidthJoiner ||
				isKeycap ||
				isTagsBlock ||
				isCombiningMark;

			if (!isCombining) {
				break;
			}

			// Merge with previous character
			value += nextCharacter.value;
			i++; // Consume next character.
			isCombined = true;

			// If it was a ZWJ, also consume the character after it.
			if (isZeroWidthJoiner && i + 1 < characters.length) {
				const characterAfterZwj = characters[i + 1];

				if (characterAfterZwj) {
					value += characterAfterZwj.value;
					i++; // Consume character after ZWJ.
				}
			}
		}

		if (isCombined) {
			combinedCharacters.push({...character, value});
		} else {
			combinedCharacters.push(character);
		}
	}

	toStyledCharactersCache.set(text, combinedCharacters);

	return combinedCharacters;
}

export function styledCharsWidth(styledChars: StyledChar[]): number {
	let length = 0;
	for (const char of styledChars) {
		length += inkCharacterWidth(char.value);
	}

	return length;
}

export function inkCharacterWidth(text: string): number {
	const width = widthCache.get(text);
	if (width !== undefined) {
		return width;
	}

	const calculatedWidth = currentStringWidth(text);
	widthCache.set(text, calculatedWidth);
	return calculatedWidth;
}

export function splitStyledCharsByNewline(
	styledChars: StyledChar[],
): StyledChar[][] {
	const lines: StyledChar[][] = [[]];

	for (const char of styledChars) {
		if (char.value === '\n') {
			lines.push([]);
		} else {
			lines.at(-1)!.push(char);
		}
	}

	return lines;
}

export function widestLineFromStyledChars(lines: StyledChar[][]): number {
	let maxWidth = 0;
	for (const line of lines) {
		maxWidth = Math.max(maxWidth, styledCharsWidth(line));
	}

	return maxWidth;
}

export function styledCharsToString(styledChars: StyledChar[]): string {
	let result = '';
	for (const char of styledChars) {
		result += char.value;
	}

	return result;
}

export function measureStyledChars(styledChars: StyledChar[]): {
	width: number;
	height: number;
} {
	if (styledChars.length === 0) {
		return {
			width: 0,
			height: 0,
		};
	}

	const lines = splitStyledCharsByNewline(styledChars);
	const width = widestLineFromStyledChars(lines);
	const height = lines.length;
	const dimensions = {width, height};
	return dimensions;
}
