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
			visible = 0;
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
		if (char.value === ' ') {
			if (currentWord.length > 0) {
				words.push(currentWord);
			}

			currentWord = [];
		} else {
			currentWord.push(char);
		}
	}

	if (currentWord.length > 0) {
		words.push(currentWord);
	}

	const space: StyledChar = {
		type: 'char',
		value: ' ',
		fullWidth: false,
		styles: [],
	};

	for (const [index, word] of words.entries()) {
		const wordWidth = styledCharsWidth(word);
		let rowWidth = styledCharsWidth(rows.at(-1)!);

		if (index > 0) {
			rows.at(-1)!.push(space);
			rowWidth++;
		}

		if (wordWidth > columns) {
			if (index > 0) {
				rows[rows.length - 1] = rows.at(-1)!.slice(0, -1);

				if (rows.at(-1)!.length > 0) {
					rows.push([]);
				}
			}

			wrapWord(rows, word, columns);
			continue;
		}

		if (rowWidth + wordWidth > columns && rowWidth > 0) {
			if (index > 0) {
				rows[rows.length - 1] = rows.at(-1)!.slice(0, -1);
			}

			rows.push(word);
		} else {
			rows.at(-1)!.push(...word);
		}
	}

	return rows;
};
