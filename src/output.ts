import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';
import widestLine from 'widest-line';
import {
	type StyledChar,
	styledCharsFromTokens,
	styledCharsToString,
	tokenize,
} from '@alcalzone/ansi-tokenize';
import {type OutputTransformer} from './render-node-to-output.js';

type TermCursorFocusInfo = {
	x: number;
	y: number;
	text: string;
	originalText: string;
	terminalCursorPosition?: number;
};

/**
"Virtual" output class

Handles the positioning and saving of the output of each node in the tree. Also responsible for applying transformations to each character of the output.

Used to generate the final output of all nodes before writing it to actual output stream (e.g. stdout)
*/

type Options = {
	width: number;
	height: number;
};

type Operation = WriteOperation | ClipOperation | UnclipOperation;

type WriteOperation = {
	type: 'write';
	x: number;
	y: number;
	text: string;
	transformers: OutputTransformer[];
};

type ClipOperation = {
	type: 'clip';
	clip: Clip;
};

type Clip = {
	x1: number | undefined;
	x2: number | undefined;
	y1: number | undefined;
	y2: number | undefined;
};

type UnclipOperation = {
	type: 'unclip';
};

export default class Output {
	width: number;
	height: number;

	private readonly operations: Operation[] = [];
	private cursorFocusInfo: TermCursorFocusInfo | undefined = undefined;

	constructor(options: Options) {
		const {width, height} = options;

		this.width = width;
		this.height = height;
	}

	write(
		x: number,
		y: number,
		text: string,
		options: {
			transformers: OutputTransformer[];
			isTerminalCursorFocused?: boolean;
			terminalCursorPosition?: number;
			originalText?: string;
		},
	): void {
		const {
			transformers,
			isTerminalCursorFocused,
			terminalCursorPosition,
			originalText,
		} = options;

		// Track cursor target position for terminal cursor synchronization
		// This should be set even for empty text (e.g., empty input field with prefix in separate Text)
		if (isTerminalCursorFocused) {
			this.cursorFocusInfo = {
				x,
				y,
				text: text || '',
				// Use originalText for cursor calculation (before applyPaddingToText)
				originalText: originalText ?? text ?? '',
				terminalCursorPosition,
			};
		}

		if (!text) {
			return;
		}

		this.operations.push({
			type: 'write',
			x,
			y,
			text,
			transformers,
		});
	}

	clip(clip: Clip) {
		this.operations.push({
			type: 'clip',
			clip,
		});
	}

	unclip() {
		this.operations.push({
			type: 'unclip',
		});
	}

	get(): {
		output: string;
		height: number;
		cursorPosition?: {row: number; col: number} | undefined;
	} {
		// Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
		const output: StyledChar[][] = [];

		for (let y = 0; y < this.height; y++) {
			const row: StyledChar[] = [];

			for (let x = 0; x < this.width; x++) {
				row.push({
					type: 'char',
					value: ' ',
					fullWidth: false,
					styles: [],
				});
			}

			output.push(row);
		}

		const clips: Clip[] = [];

		for (const operation of this.operations) {
			if (operation.type === 'clip') {
				clips.push(operation.clip);
			}

			if (operation.type === 'unclip') {
				clips.pop();
			}

			if (operation.type === 'write') {
				const {text, transformers} = operation;
				let {x, y} = operation;
				let lines = text.split('\n');

				const clip = clips.at(-1);

				if (clip) {
					const clipHorizontally =
						typeof clip?.x1 === 'number' && typeof clip?.x2 === 'number';

					const clipVertically =
						typeof clip?.y1 === 'number' && typeof clip?.y2 === 'number';

					// If text is positioned outside of clipping area altogether,
					// skip to the next operation to avoid unnecessary calculations
					if (clipHorizontally) {
						const width = widestLine(text);

						if (x + width < clip.x1! || x > clip.x2!) {
							continue;
						}
					}

					if (clipVertically) {
						const height = lines.length;

						if (y + height < clip.y1! || y > clip.y2!) {
							continue;
						}
					}

					if (clipHorizontally) {
						lines = lines.map(line => {
							const from = x < clip.x1! ? clip.x1! - x : 0;
							const width = stringWidth(line);
							const to = x + width > clip.x2! ? clip.x2! - x : width;

							return sliceAnsi(line, from, to);
						});

						if (x < clip.x1!) {
							x = clip.x1!;
						}
					}

					if (clipVertically) {
						const from = y < clip.y1! ? clip.y1! - y : 0;
						const height = lines.length;
						const to = y + height > clip.y2! ? clip.y2! - y : height;

						lines = lines.slice(from, to);

						if (y < clip.y1!) {
							y = clip.y1!;
						}
					}
				}

				let offsetY = 0;

				for (let [index, line] of lines.entries()) {
					const currentLine = output[y + offsetY];

					// Line can be missing if `text` is taller than height of pre-initialized `this.output`
					if (!currentLine) {
						continue;
					}

					for (const transformer of transformers) {
						line = transformer(line, index);
					}

					const characters = styledCharsFromTokens(tokenize(line));
					let offsetX = x;

					for (const character of characters) {
						currentLine[offsetX] = character;

						// Determine printed width using string-width to align with measurement
						const characterWidth = Math.max(1, stringWidth(character.value));

						// For multi-column characters, clear following cells to avoid stray spaces/artifacts
						if (characterWidth > 1) {
							for (let index = 1; index < characterWidth; index++) {
								currentLine[offsetX + index] = {
									type: 'char',
									value: '',
									fullWidth: false,
									styles: character.styles,
								};
							}
						}

						offsetX += characterWidth;
					}

					offsetY++;
				}
			}
		}

		// Calculate cursor position from cursor target (if exists)
		let cursorPosition: {row: number; col: number} | undefined;
		if (this.cursorFocusInfo) {
			const {
				x,
				y,
				text,
				originalText,
				terminalCursorPosition: charIndex,
			} = this.cursorFocusInfo;

			if (charIndex === undefined) {
				// Use text end (backward compatible)
				const textLines = text.split('\n');
				const lastLineIndex = textLines.length - 1;
				const lastLine = textLines[lastLineIndex] ?? '';

				const cursorRow = y + lastLineIndex;
				const expectedCol =
					lastLineIndex === 0
						? x + stringWidth(lastLine)
						: stringWidth(lastLine);

				cursorPosition = {
					row: cursorRow,
					col: expectedCol,
				};
			} else {
				// Use character index to calculate cursor position
				// Use originalText (before applyPaddingToText) for correct index calculation
				const clampedIndex = Math.min(charIndex, originalText.length);
				const textBeforeCursor = originalText.slice(0, clampedIndex);
				const lines = textBeforeCursor.split('\n');
				const lineIndex = lines.length - 1;
				const currentLine = lines[lineIndex] ?? '';

				const cursorRow = y + lineIndex;
				// For multi-line text, all lines start at x position (due to indentString in applyPaddingToText)
				const expectedCol = x + stringWidth(currentLine);

				cursorPosition = {
					row: cursorRow,
					col: expectedCol,
				};
			}
		}

		const generatedOutput = output
			.map(line => {
				// See https://github.com/vadimdemedes/ink/pull/564#issuecomment-1637022742
				const lineWithoutEmptyItems = line.filter(item => item !== undefined);

				return styledCharsToString(lineWithoutEmptyItems).trimEnd();
			})
			.join('\n');

		// Adjust cursor position based on actual output (after trimEnd)
		if (cursorPosition) {
			const lines = generatedOutput.split('\n');
			const cursorLine = lines[cursorPosition.row];
			if (cursorLine !== undefined) {
				const actualLineWidth = stringWidth(cursorLine);
				// Cursor should not go beyond the actual trimmed line width
				cursorPosition.col = Math.min(cursorPosition.col, actualLineWidth);
			}
		}

		return {
			output: generatedOutput,
			height: output.length,
			cursorPosition,
		};
	}
}
