import {type Writable} from 'node:stream';
import isInCi from 'is-in-ci';

const beginSynchronizedUpdate = '\u001B[?2026h';
const endSynchronizedUpdate = '\u001B[?2026l';

/**
Writes text to a stream, wrapping it with Synchronized Update Mode
escape sequences (BSU/ESU) when the stream is a TTY and not running in CI.

This prevents terminal multiplexers from reading intermediate cursor
positions during rendering, which fixes IME candidate window positioning.

@see https://gist.github.com/christianparpart/d8a62cc1ab659194337d73e399004036
*/
export default function writeSynchronized(
	stream: Writable,
	text: string,
): void {
	const tty = 'isTTY' in stream && (stream as any).isTTY === true;

	if (tty && !isInCi) {
		stream.write(beginSynchronizedUpdate + text + endSynchronizedUpdate);
	} else {
		stream.write(text);
	}
}
