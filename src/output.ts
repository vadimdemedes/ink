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

	constructor(options: Options) {
		const {width, height} = options;

		this.width = width;
		this.height = height;
	}

	write(
		x: number,
		y: number,
		text: string,
		options: {transformers: OutputTransformer[]},
	): void {
		const {transformers} = options;

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

	get(): {output: string; height: number} {
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
				const previousClip = clips.at(-1);
				const nextClip = {...operation.clip};

				if (previousClip) {
					nextClip.x1 =
						previousClip.x1 === undefined
							? nextClip.x1
							: nextClip.x1 === undefined
								? previousClip.x1
								: Math.max(previousClip.x1, nextClip.x1);

					nextClip.x2 =
						previousClip.x2 === undefined
							? nextClip.x2
							: nextClip.x2 === undefined
								? previousClip.x2
								: Math.min(previousClip.x2, nextClip.x2);

					nextClip.y1 =
						previousClip.y1 === undefined
							? nextClip.y1
							: nextClip.y1 === undefined
								? previousClip.y1
								: Math.max(previousClip.y1, nextClip.y1);

					nextClip.y2 =
						previousClip.y2 === undefined
							? nextClip.y2
							: nextClip.y2 === undefined
								? previousClip.y2
								: Math.min(previousClip.y2, nextClip.y2);
				}

				clips.push(nextClip);
				continue;
			}

			if (operation.type === 'unclip') {
				clips.pop();
				continue;
			}

			if (operation.type === 'write') {
				this.applyWriteOperation(output, clips, operation);
			}
		}

		const generatedOutput = output
			.map(line => {
				// See https://github.com/vadimdemedes/ink/pull/564#issuecomment-1637022742
				const lineWithoutEmptyItems = line.filter(item => item !== undefined);

				return styledCharsToString(lineWithoutEmptyItems).trimEnd();
			})
			.join('\n');

		return {
			output: generatedOutput,
			height: output.length,
		};
	}

	private applyWriteOperation(
		output: StyledChar[][],
		clips: Clip[],
		operation: WriteOperation,
	) {
		const {text, transformers} = operation;
		let {x, y} = operation;
		let lines = text.split('\n');
		const clip = clips.at(-1);

		if (clip) {
			const clipResult = this.clipText(lines, x, y, clip);

			if (!clipResult) {
				return;
			}

			lines = clipResult.lines;
			x = clipResult.x;
			y = clipResult.y;
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

	private clipText(
		lines: string[],
		x: number,
		y: number,
		clip: Clip,
	): {lines: string[]; x: number; y: number} | undefined {
		const clipHorizontally =
			typeof clip?.x1 === 'number' && typeof clip?.x2 === 'number';

		const clipVertically =
			typeof clip?.y1 === 'number' && typeof clip?.y2 === 'number';

		if (clipHorizontally) {
			const width = widestLine(lines.join('\n'));

			if (x + width < clip.x1! || x > clip.x2!) {
				return undefined;
			}
		}

		if (clipVertically) {
			const height = lines.length;

			if (y + height < clip.y1! || y > clip.y2!) {
				return undefined;
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

		return {lines, x, y};
	}
}
