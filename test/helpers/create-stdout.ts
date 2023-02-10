import EventEmitter from 'node:events';
import {spy} from 'sinon';

// Fake process.stdout
const createStdout = (columns?: number): NodeJS.WriteStream => {
	const stdout: any = new EventEmitter();
	stdout.columns = columns ?? 100;
	stdout.write = spy();
	stdout.get = () => stdout.write.lastCall.args[0];

	return stdout;
};

export default createStdout;
