import stringLength from 'string-length';
import sliceAnsi from 'slice-ansi';

/**
 * "Virtual" output class
 *
 * Handles the positioning and saving of the output of each node in the tree.
 * Also responsible for applying transformations to each character of the output.
 *
 * Used to generate the final output of all nodes before writing it to actual output stream (e.g. stdout)
 */

export default class Output {
	constructor({width, height}) {
		// Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
		const output = [];

		for (let y = 0; y < height; y++) {
			output.push(' '.repeat(width));
		}

		this.output = output;
	}

	write(x, y, text, {transformers}) {
		const lines = text.split('\n');
		let offsetY = 0;

		for (let line of lines) {
			const length = stringLength(line);
			const currentLine = this.output[y + offsetY];

			for (const transformer of transformers) {
				line = transformer(line);
			}

			this.output[y + offsetY] = sliceAnsi(currentLine, 0, x) + line + sliceAnsi(currentLine, x + length);

			offsetY++;
		}
	}

	get() {
		return this.output
			.map(line => line.trimRight())
			.join('\n');
	}
}
