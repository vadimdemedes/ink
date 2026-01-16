import EventEmitter from 'node:events';
import {spy} from 'sinon';

// Fake process.stdout
type FakeStdout = {
	get: (options?: {skipEmpty?: boolean}) => string;
} & NodeJS.WriteStream;

const createStdout = (columns?: number): FakeStdout => {
	const stdout = new EventEmitter() as unknown as FakeStdout;
	stdout.columns = columns ?? 100;

	const write = spy();
	stdout.write = write;

	stdout.get = (options: {skipEmpty?: boolean} = {}) => {
		const calls = write.getCalls();

		if (calls.length === 0) {
			return '';
		}

		// If skipEmpty is true, iterate backwards to find the last write that isn't just control characters
		if (options.skipEmpty) {
			for (let i = calls.length - 1; i >= 0; i--) {
				const output = calls[i].args[0] as string;
				// eslint-disable-next-line no-control-regex
				const cleanOutput = output.replaceAll(/\u001B\[\?2026[hl]/g, '');
				if (cleanOutput !== '') {
					return cleanOutput;
				}
			}
			// If all are empty, fall through to return the last one (empty)
		}

		if (!write.lastCall) {
			return '';
		}

		const output = write.lastCall.args[0] as string;
		// eslint-disable-next-line no-control-regex
		return output.replaceAll(/\u001B\[\?2026[hl]/g, '');
	};

	return stdout;
};

export default createStdout;
