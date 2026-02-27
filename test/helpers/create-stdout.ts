import EventEmitter from 'node:events';
import {spy} from 'sinon';

// Fake process.stdout
type FakeStdout = {
	get: () => string;
} & NodeJS.WriteStream;

const createStdout = (columns?: number, isTTY?: boolean): FakeStdout => {
	const stdout = new EventEmitter() as unknown as FakeStdout;
	stdout.columns = columns ?? 100;
	stdout.isTTY = isTTY ?? true;

	const write = spy();
	stdout.write = write;

	stdout.get = () => write.lastCall.args[0] as string;

	return stdout;
};

export default createStdout;
