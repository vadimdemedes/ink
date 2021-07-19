import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';
import {OutputTransformer} from './render-node-to-output';

/**
 * "Virtual" output class
 *
 * Handles the positioning and saving of the output of each node in the tree.
 * Also responsible for applying transformations to each character of the output.
 *
 * Used to generate the final output of all nodes before writing it to actual output stream (e.g. stdout)
 */

interface Options {
	width: number;
	height: number;
}

interface Writes {
	x: number;
	y: number;
	text: string;
	transformers: OutputTransformer[];
}

export default class Output {
	width: number;
	height: number;

	// Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
	private readonly writes: Writes[] = [];

	constructor(options: Options) {
		const {width, height} = options;

		this.width = width;
		this.height = height;
	}

	write(
		x: number,
		y: number,
		text: string,
		options: {transformers: OutputTransformer[]}
	): void {
		const {transformers} = options;

		if (!text) {
			return;
		}

		this.writes.push({x, y, text, transformers});
	}

	get(): {output: string; height: number} {
		const output: string[] = [];

		for (let y = 0; y < this.height; y++) {
			output.push(' '.repeat(this.width));
		}

		for (const write of this.writes) {
			const {x, y, text, transformers} = write;
			const lines = text.split('\n');
			let offsetY = 0;

			for (let line of lines) {
				const currentLine = output[y + offsetY];

				// Line can be missing if `text` is taller than height of pre-initialized `this.output`
				if (!currentLine) {
					continue;
				}

				const width = stringWidth(line);

				for (const transformer of transformers) {
					line = transformer(line);
				}

				output[y + offsetY] =
					sliceAnsi(currentLine, 0, x) +
					line +
					sliceAnsi(currentLine, x + width);

				offsetY++;
			}
		}

		// eslint-disable-next-line unicorn/prefer-trim-start-end
		const generatedOutput = output.map(line => line.trimRight()).join('\n');

		return {
			output: generatedOutput,
			height: output.length
		};
	}
}
