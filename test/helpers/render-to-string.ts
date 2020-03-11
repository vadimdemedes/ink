import {ReactNode} from 'react';
import {render} from '../../src';

// Fake process.stdout
class Stream {
	output = '';
	columns: number;

	constructor({columns}) {
		this.columns = columns || 100;
	}

	write(str: string) {
		this.output = str;
	}

	get() {
		return this.output;
	}
}

const renderToString: (
	node: ReactNode,
	options?: { columns?: number }
) => string = (node, {columns} = {}) => {
	const stream = new Stream({columns});

	render(node, {
		// @ts-ignore
		stdout: stream,
		debug: true,
		experimental: process.env.EXPERIMENTAL === 'true'
	});

	return stream.get();
};

export default renderToString;
