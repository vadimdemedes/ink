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

for (const [sequenceName, sequence, expected] of [
	['bsu', bsu, '\u001B[?2026h'],
	['esu', esu, '\u001B[?2026l'],
] as const) {
	test(`${sequenceName} is the expected synchronized update sequence`, t => {
		t.is(sequence, expected);
	});
}

test('shouldSynchronize returns true for interactive TTY stream', t => {
	const stream = createStream({tty: true});
	t.true(shouldSynchronize(stream, true));
});

test('shouldSynchronize returns false for non-interactive TTY stream', t => {
	const stream = createStream({tty: true});
	t.false(shouldSynchronize(stream, false));
});

test('shouldSynchronize returns false for non-TTY stream', t => {
	const stream = createStream({tty: false});
	t.false(shouldSynchronize(stream, true));
});
