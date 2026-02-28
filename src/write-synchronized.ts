import {type Writable} from 'node:stream';

export const bsu = '\u001B[?2026h';
export const esu = '\u001B[?2026l';

export function shouldSynchronize(
	stream: Writable,
	interactive: boolean,
): boolean {
	return (
		'isTTY' in stream &&
		(stream as Writable & {isTTY: boolean}).isTTY &&
		interactive
	);
}
