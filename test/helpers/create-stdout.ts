import EventEmitter from 'events';
import sinon from 'sinon';

// Fake process.stdout
interface Stream extends EventEmitter {
	output: string;
	columns: number;
	write(str: string): void;
	get(): string;
}

export default (columns?: number): Stream => {
	const stdout: any = new EventEmitter();
	stdout.columns = columns ?? 100;
	stdout.write = sinon.spy();
	stdout.get = () => stdout.write.lastCall.args[0];

	// @ts-ignore
	return stdout;
};
