import EventEmitter from 'node:events';
import test from 'ava';
import {bsu, esu, shouldSynchronize} from '../src/write-synchronized.js';

const createStream = ({tty = false} = {}) => {
	const stream = new EventEmitter() as unknown as NodeJS.WriteStream;
	if (tty) {
		stream.isTTY = true;
	}

	return stream;
};

test('bsu is the Begin Synchronized Update sequence', t => {
	t.is(bsu, '\u001B[?2026h');
});

test('esu is the End Synchronized Update sequence', t => {
	t.is(esu, '\u001B[?2026l');
});

test('shouldSynchronize returns true for TTY stream', t => {
	const stream = createStream({tty: true});
	t.true(shouldSynchronize(stream));
});

test('shouldSynchronize returns false for non-TTY stream', t => {
	const stream = createStream({tty: false});
	t.false(shouldSynchronize(stream));
});
