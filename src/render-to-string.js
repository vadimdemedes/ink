import render from './render';

// Fake process.stdout
class Stream {
	constructor() {
		this.output = '';
		this.columns = 100;
	}

	write(str) {
		this.output = str;
	}

	get() {
		return this.output;
	}
}

export default node => {
	const stream = new Stream();

	render(node, {
		stdout: stream,
		debug: true
	});

	return stream.get();
};
