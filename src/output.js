import stringLength from 'string-length';
import sliceAnsi from 'slice-ansi';

export default class Output {
	constructor({height}) {
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

		for (let y = 0; y < this.output.length; y++) {
			if (this.output[y]) {
				for (let x = 0; x < this.output[y].length; x++) {
					ret += this.output[y][x] || ' ';
				}
			}

			ret += '\n';
		}

		return ret;
	}
}
