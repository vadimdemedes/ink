import stringLength from 'string-length';
import sliceAnsi from 'slice-ansi';
import {OutputWriteOptions, OutputWriter} from './render-node-to-output';

interface OutputConstructorOptions {
	width: number;
	height: number;
}

/**
 * "Virtual" output class
 *
 * Handles the positioning and saving of the output of each node in the tree.
 * Also responsible for applying transformations to each character of the output.
 *
 * Used to generate the final output of all nodes before writing it to actual output stream (e.g. stdout)
 */
export default class Output implements OutputWriter {
	output: string[];

	constructor(options: OutputConstructorOptions) {
		const {width, height} = options;
		// Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
		const output = [];

		for (let y = 0; y < height; y++) {
			output.push(' '.repeat(width));
		}

		this.output = output;
	}

	write(x: number, y: number, text: string, options: OutputWriteOptions) {
		const {transformers} = options;

		if (!text) {
			return;
		}

		const lines = text.split('\n');
		let offsetY = 0;

		for (let line of lines) {
			const length = stringLength(line);
			const currentLine = this.output[y + offsetY];

			// Line can be missing if `text` is taller than height of pre-initialized `this.output`
			if (!currentLine) {
				continue;
			}

			for (const transformer of transformers) {
				line = transformer(line);
			}

			this.output[y + offsetY] =
				sliceAnsi(currentLine, 0, x) +
				line +
				sliceAnsi(currentLine, x + length);

			offsetY++;
		}
	}

	get() {
		return this.output.map(line => line.trimRight()).join('\n');
	}

	getHeight() {
		return this.output.length;
	}
}
