import sliceAnsi from 'slice-ansi';
import stringLength from 'string-length';
import {Bounds, OutputTransformer} from './render-node-to-output';

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
	bounds?: Bounds;
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
		options: {transformers: OutputTransformer[]; bounds?: Bounds}
	): void {
		const {transformers, bounds} = options;

		if (!text) {
			return;
		}

		this.writes.push({x, y, text, transformers, bounds});
	}

	get(): {output: string; height: number} {
		const output: string[] = [];

		for (let y = 0; y < this.height; y++) {
			output.push(' '.repeat(this.width));
		}

		for (const write of this.writes) {
			const {x, y, text, transformers, bounds} = write;
			const lines = text.split('\n');
			let offsetY = 0;

			for (let line of lines) {
				if (
					bounds &&
					(y + offsetY < bounds.top || y + offsetY >= bounds.bottom)
				) {
					offsetY++;
					continue;
				}

				const currentLine = output[y + offsetY];

				// Line can be missing if `text` is taller than height of pre-initialized `this.output`
				if (!currentLine) {
					offsetY++;
					continue;
				}

				for (const transformer of transformers) {
					line = transformer(line);
				}

				const length = stringLength(line);

				let startX = x;
				let endX = x + length;
				if (bounds) {
					startX = Math.max(bounds.left, startX);
					endX = Math.min(bounds.right, endX);

					if (endX <= startX) {
						offsetY++;
						continue;
					}

					if (endX - startX < length) {
						line = sliceAnsi(line, startX - x, endX - startX);
					}
				}

				output[y + offsetY] =
					sliceAnsi(currentLine, 0, startX) +
					line +
					sliceAnsi(currentLine, endX);

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
