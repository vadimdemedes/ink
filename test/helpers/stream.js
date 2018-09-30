import stripAnsi from 'strip-ansi';

export default class Stream {
	constructor() {
		this.output = '';
		this.columns = 100
	}

	write(str) {
		this.output += str;
	}

	get() {
		return stripAnsi(this.output);
	}
}
