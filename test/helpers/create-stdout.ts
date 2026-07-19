import EventEmitter from 'node:events';
import {spy} from 'sinon';

// Fake process.stdout
export type FakeStdout = {
	get: () => string;
	getWrites: () => string[];
} & NodeJS.WriteStream;

const createStdout = (columns?: number, isTTY?: boolean, rows?: number): FakeStdout => {
	const stdout = new EventEmitter() as unknown as FakeStdout;
	stdout.columns = columns ?? 100;
	stdout.isTTY = isTTY ?? true;
	if (rows !== undefined) {
		stdout.rows = rows;
	}

	const write = spy();
	stdout.write = write;

	stdout.get = () => write.lastCall.args[0] as string;

	stdout.getWrites = () => (write.args as string[][]).map(args => args[0]!);

	return stdout;
};

export default createStdout;
