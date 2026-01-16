import EventEmitter from 'node:events';
import {spy} from 'sinon';

// Fake process.stdout
type FakeStdout = {
	get: () => string;
} & NodeJS.WriteStream;

const createStdout = (columns?: number): FakeStdout => {
	const stdout = new EventEmitter() as unknown as FakeStdout;
	stdout.columns = columns ?? 100;

	const write = spy();
	stdout.write = write;

	stdout.get = () => {
		const calls = write.getCalls();
		// Iterate backwards to find the last write that isn't just control characters
		for (let i = calls.length - 1; i >= 0; i--) {
			const output = calls[i].args[0] as string;
			// eslint-disable-next-line no-control-regex
			const cleanOutput = output.replaceAll(/\u001B\[\?2026[hl]/g, '');
			if (cleanOutput !== '') {
				return cleanOutput;
			}
		}

		return '';
	};

	return stdout;
};

export default createStdout;
