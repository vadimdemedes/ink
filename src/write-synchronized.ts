import {type Writable} from 'node:stream';
import isInCi from 'is-in-ci';

export const bsu = '\u001B[?2026h';
export const esu = '\u001B[?2026l';

export function shouldSynchronize(stream: Writable): boolean {
	return 'isTTY' in stream && (stream as any).isTTY === true && !isInCi;
}
