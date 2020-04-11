import {render} from '../../src';

// Fake process.stdout
interface Stream {
	output: string;
	columns: number;
	write(str: string): void;
	get(): string;
}

const createStream: (options: { columns: number }) => Stream = ({
	columns
}) => {
	let output = '';
	return {
		output,
		columns,
		write(str: string) {
			output = str;
		},
		get() {
			return output;
		}
	};
};

export const renderToString: (
	node: JSX.Element,
	options?: { columns: number }
) => string = (node, options = {columns: 100}) => {
	const stream = createStream(options);

	render(node, {
		// @ts-ignore
		stdout: stream,
		debug: true,
		experimental: process.env.EXPERIMENTAL === 'true'
	});

	return stream.get();
};
