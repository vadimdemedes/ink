import EventEmitter from 'node:events';
import test from 'ava';
import {spy} from 'sinon';
import writeSynchronized from '../src/write-synchronized.js';

const beginSynchronizedUpdate = '\u001B[?2026h';
const endSynchronizedUpdate = '\u001B[?2026l';

const createStream = ({tty = false} = {}) => {
	const stream = new EventEmitter() as unknown as NodeJS.WriteStream;
	stream.write = spy();
	if (tty) {
		stream.isTTY = true;
	}

	return stream;
};

test('wraps output with synchronized update sequences when stream is TTY', t => {
	const stream = createStream({tty: true});
	writeSynchronized(stream, 'hello');
	t.is((stream.write as any).callCount, 1);
	t.is(
		(stream.write as any).firstCall.args[0],
		beginSynchronizedUpdate + 'hello' + endSynchronizedUpdate,
	);
});

test('does not wrap output when stream is not TTY', t => {
	const stream = createStream({tty: false});
	writeSynchronized(stream, 'hello');
	t.is((stream.write as any).callCount, 1);
	t.is((stream.write as any).firstCall.args[0], 'hello');
});

test('writes content in a single write call', t => {
	const stream = createStream({tty: true});
	writeSynchronized(stream, 'line1\nline2\nline3');
	t.is((stream.write as any).callCount, 1);
	const written = (stream.write as any).firstCall.args[0] as string;
	t.true(written.startsWith(beginSynchronizedUpdate));
	t.true(written.endsWith(endSynchronizedUpdate));
	t.true(written.includes('line1\nline2\nline3'));
});
