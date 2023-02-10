import EventEmitter from 'events';
import sinon from 'sinon';

// Fake process.stdout
export default (columns?: number): NodeJS.WriteStream => {
	const stdout: any = new EventEmitter();
	stdout.columns = columns ?? 100;
	stdout.write = sinon.spy();
	stdout.get = () => stdout.write.lastCall.args[0];

	return stdout;
};
