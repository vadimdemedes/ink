import stringLength from 'string-length';
import sliceAnsi from 'slice-ansi';

export default class Output {
	constructor({height}) {
		this.output = new Array(height);
	}

	write(x, y, text, {transformers}) {
		transformers.forEach(transformer => {
			text = transformer(text);
		});

		const lines = text.split('\n');
		let offsetY = 0;

		for (const line of lines) {
			const length = stringLength(line);

			for (let offsetX = 0; offsetX < length; offsetX++) {
				if (!Array.isArray(this.output[y + offsetY])) {
					this.output[y + offsetY] = [];
				}

				this.output[y + offsetY][x + offsetX] = sliceAnsi(line, offsetX, offsetX + 1);
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
