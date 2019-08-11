import {render} from '../..';

// Fake process.stdout
class Stream {
	constructor({columns}) {
		this.output = '';
		this.columns = columns || 100;
	}

	write(str) {
		this.output = str;
	}

	get() {
		return this.output;
	}
}

export default (node, {columns} = {}) => {
	const stream = new Stream({columns});

	render(node, {
		stdout: stream,
		debug: true,
		experimental: process.env.EXPERIMENTAL === 'true'
	});

	return stream.get();
};
