import EventEmitter from 'node:events';
import test from 'ava';
import {BSU, ESU, shouldSynchronize} from '../src/write-synchronized.js';

const createStream = ({tty = false} = {}) => {
	const stream = new EventEmitter() as unknown as NodeJS.WriteStream;
	if (tty) {
		stream.isTTY = true;
	}

	return stream;
};

test('BSU is the Begin Synchronized Update sequence', t => {
	t.is(BSU, '\u001B[?2026h');
});

test('ESU is the End Synchronized Update sequence', t => {
	t.is(ESU, '\u001B[?2026l');
});

test('shouldSynchronize returns true for TTY stream', t => {
	const stream = createStream({tty: true});
	t.true(shouldSynchronize(stream));
});

test('shouldSynchronize returns false for non-TTY stream', t => {
	const stream = createStream({tty: false});
	t.false(shouldSynchronize(stream));
});
