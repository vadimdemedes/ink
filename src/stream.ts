export type OutputStream = NodeJS.WritableStream & {
	isTTY?: boolean;
	columns?: number;
	rows?: number;
	destroyed?: boolean;
	writableEnded?: boolean;
};

type RawModeStream = NodeJS.ReadableStream & {
	isTTY: true;
	setRawMode: (isEnabled: boolean) => void;
	ref?: () => void;
	unref?: () => void;
};

export const isTty = (stream: NodeJS.ReadableStream): boolean =>
	'isTTY' in stream && stream.isTTY === true;

const isRawModeStream = (
	stdin: NodeJS.ReadableStream,
): stdin is RawModeStream =>
	isTty(stdin) &&
	'setRawMode' in stdin &&
	typeof stdin.setRawMode === 'function';

export const getRawModeStream = (
	stdin: NodeJS.ReadableStream,
): RawModeStream | undefined => (isRawModeStream(stdin) ? stdin : undefined);
