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
		this.width = width;
		this.height = height;
		this.writes = [];
		// Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
	}

	write(x, y, text, {transformers}) {
		if (!text) {
			return;
		}

		this.writes.push({x, y, text, transformers});
	}

	get() {
		const output = [];

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

				const length = stringLength(line);

				for (const transformer of transformers) {
					line = transformer(line);
				}

				output[y + offsetY] = sliceAnsi(currentLine, 0, x) + line + sliceAnsi(currentLine, x + length);

				offsetY++;
			}
		}

		return output
			.map(line => line.trimRight())
			.join('\n');
	}
}
