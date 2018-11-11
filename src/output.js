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
	constructor({height}) {
		// Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
		this.output = new Array(height);
	}

	write(x, y, text, {transformers}) {
		const lines = text.split('\n');
		let offsetY = 0;

		for (const line of lines) {
			const length = stringLength(line);

			for (let offsetX = 0; offsetX < length; offsetX++) {
				if (!Array.isArray(this.output[y + offsetY])) {
					this.output[y + offsetY] = [];
				}

				// Since number of characters displayed visually isn't equal to actual number of characters
				// because of ANSI escapes, use `sliceAnsi` module to retrieve actual character along with
				// ANSI escapes that wrap it and apply transformations to it
				//
				// It results in a lot more ANSI escapes in the output, but it produces correct output
				let char = sliceAnsi(line, offsetX, offsetX + 1);

				for (const transformer of transformers) {
					char = transformer(char);
				}

				this.output[y + offsetY][x + offsetX] = char;
			}

			offsetY++;
		}
	}

	get() {
		let ret = '';

		const rows = this.output.length;
		for (let y = 0; y < rows; y++) {
			if (this.output[y]) {
				const columns = this.output[y].length;
				for (let x = 0; x < columns; x++) {
					// Treat empty columns as spaces
					ret += this.output[y][x] || ' ';
				}
			}

			ret += '\n';
		}

		return ret;
	}
}
