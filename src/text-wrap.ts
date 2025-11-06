import {type StyledChar} from '@alcalzone/ansi-tokenize';
import {inkCharacterWidth, styledCharsWidth} from './measure-text.js';

export const sliceStyledChars = (
	styledChars: StyledChar[],
	begin: number,
	end?: number,
): StyledChar[] => {
	let width = 0;
	const result: StyledChar[] = [];

	for (const char of styledChars) {
		const charWidth = inkCharacterWidth(char.value);
		const charStart = width;
		const charEnd = width + charWidth;

		if (end !== undefined && charEnd > end) {
			break;
		}

		if (charStart >= begin) {
			result.push(char);
		}

		width += charWidth;
	}

	return result;
};

export const truncateStyledChars = (
	styledChars: StyledChar[],
	columns: number,
	options: {position?: 'start' | 'middle' | 'end'} = {},
): StyledChar[] => {
	const {position = 'end'} = options;
	const truncationCharacter = '…';
	const truncationStyledChar: StyledChar = {
		type: 'char',
		value: truncationCharacter,
		fullWidth: false,
		styles: [],
	};

	if (columns < 1) {
		return [];
	}

	if (columns === 1) {
		return [truncationStyledChar];
	}

	const textWidth = styledCharsWidth(styledChars);

	if (textWidth <= columns) {
		return styledChars;
	}

	const truncationWidth = inkCharacterWidth(truncationCharacter);

	if (position === 'start') {
		const right = sliceStyledChars(
			styledChars,
			textWidth - columns + truncationWidth,
			textWidth,
		);
		return [truncationStyledChar, ...right];
	}

	if (position === 'middle') {
		const leftWidth = Math.ceil(columns / 2);
		const rightWidth = columns - leftWidth;
		const left = sliceStyledChars(styledChars, 0, leftWidth - truncationWidth);
		const right = sliceStyledChars(
			styledChars,
			textWidth - rightWidth,
			textWidth,
		);
		return [...left, truncationStyledChar, ...right];
	}

	const left = sliceStyledChars(styledChars, 0, columns - truncationWidth);
	return [...left, truncationStyledChar];
};

const wrapWord = (
	rows: StyledChar[][],
	word: StyledChar[],
	columns: number,
) => {
	let currentLine = rows.at(-1)!;
	let visible = styledCharsWidth(currentLine);

	for (const character of word) {
		const characterLength = inkCharacterWidth(character.value);

		if (visible + characterLength > columns && visible > 0) {
			rows.push([]);

			currentLine = rows.at(-1)!;
			visible = styledCharsWidth(currentLine);
		}

		currentLine.push(character);
		visible += characterLength;
	}
};

export const wrapStyledChars = (
	styledChars: StyledChar[],
	columns: number,
): StyledChar[][] => {
	const rows: StyledChar[][] = [[]];
	const words: StyledChar[][] = [];
	let currentWord: StyledChar[] = [];

	for (const char of styledChars) {
		if (char.value === '\n') {
			if (currentWord.length > 0) {
				words.push(currentWord);
			}

			currentWord = [];
			words.push([char]);
		} else if (char.value === ' ') {
			if (currentWord.length > 0) {
				words.push(currentWord);
			}

			currentWord = [];
			words.push([char]);
		} else {
			currentWord.push(char);
		}
	}

	if (currentWord.length > 0) {
		words.push(currentWord);
	}

	let isAtStartOfLogicalLine = true;

	for (const word of words) {
		if (word.length === 0) {
			continue;
		}

		if (word[0]!.value === '\n') {
			rows.push([]);
			isAtStartOfLogicalLine = true;
			continue;
		}

		const wordWidth = styledCharsWidth(word);
		const rowWidth = styledCharsWidth(rows.at(-1)!);

		if (rowWidth + wordWidth > columns) {
			if (
				!isAtStartOfLogicalLine &&
				word[0]!.value === ' ' &&
				word.length === 1
			) {
				continue;
			}

			if (!isAtStartOfLogicalLine) {
				while (rows.at(-1)!.length > 0 && rows.at(-1)!.at(-1)!.value === ' ') {
					rows.at(-1)!.pop();
				}
			}

			if (wordWidth > columns) {
				if (rowWidth > 0) {
					rows.push([]);
				}

				wrapWord(rows, word, columns);
			} else {
				rows.push([]);
				rows.at(-1)!.push(...word);
			}
		} else {
			rows.at(-1)!.push(...word);
		}

		if (
			isAtStartOfLogicalLine &&
			!(word[0]!.value === ' ' && word.length === 1)
		) {
			isAtStartOfLogicalLine = false;
		}
	}

	return rows;
};
