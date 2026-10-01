import EventEmitter from 'node:events';
import test, {type TestContext} from 'node:test';
import isInCi from 'is-in-ci';
import {bsu, esu, shouldSynchronize} from '../src/write-synchronized.js';

const createStream = ({tty = false} = {}) => {
	const stream = new EventEmitter() as unknown as NodeJS.WriteStream;
	if (tty) {
		stream.isTTY = true;
	}

	return stream;
};

for (const [sequenceName, sequence, expected] of [
	['bsu', bsu, '\u{1B}[?2026h'],
	['esu', esu, '\u{1B}[?2026l'],
] as const) {
	test(`${sequenceName} is the expected synchronized update sequence`, (t: TestContext) => {
		t.assert.strictEqual(sequence, expected);
	});
}

test('shouldSynchronize returns true for interactive TTY stream', (t: TestContext) => {
	const stream = createStream({tty: true});
	t.assert.ok(shouldSynchronize(stream, true));
});

test('shouldSynchronize returns false for non-interactive TTY stream', (t: TestContext) => {
	const stream = createStream({tty: true});
	t.assert.strictEqual(shouldSynchronize(stream, false), false);
});

test('shouldSynchronize returns false for non-TTY stream', (t: TestContext) => {
	const stream = createStream({tty: false});
	t.assert.strictEqual(shouldSynchronize(stream, true), false);
});

test('shouldSynchronize uses CI detection when interactive is not specified', (t: TestContext) => {
	const ttyStream = createStream({tty: true});
	// When interactive is omitted, shouldSynchronize falls back to is-in-ci.
	// In CI the result is false (non-interactive by design); outside CI it's true.
	if (isInCi) {
		t.assert.strictEqual(shouldSynchronize(ttyStream), false);
	} else {
		t.assert.ok(shouldSynchronize(ttyStream));
	}
});

test('shouldSynchronize returns false for non-TTY stream when interactive is not specified', (t: TestContext) => {
	const stream = createStream({tty: false});
	t.assert.strictEqual(shouldSynchronize(stream), false);
});
