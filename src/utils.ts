import terminalSize from 'terminal-size';
import type {OutputStream} from './stream.js';

const resolveDimension = (
	value: number | undefined,
	fallback: number | undefined,
	defaultValue: number,
): number => {
	if (value !== undefined && value > 0) {
		return value;
	}

	return fallback !== undefined && fallback > 0 ? fallback : defaultValue;
};

// `terminal-size` opens `/dev/tty` or spawns `tput` on each call, and this runs on every render. A stream without its own size has no `resize` event to invalidate on, so keep the first result per stream.
const fallbackSizes = new WeakMap<
	OutputStream,
	{columns: number; rows: number}
>();

const getFallbackSize = (
	stdout: OutputStream,
): {columns: number; rows: number} => {
	let size = fallbackSizes.get(stdout);
	if (size === undefined) {
		size = terminalSize();
		fallbackSizes.set(stdout, size);
	}

	return size;
};

/**
Get the effective terminal dimensions from the given stdout stream.

Falls back to `terminal-size` for columns in piped processes where `stdout.columns` is 0, and uses standard defaults (80×24) when dimensions cannot be determined.
*/
export const getWindowSize = (
	stdout: OutputStream,
): {columns: number; rows: number} => {
	// `stdout.columns`/`rows` can be 0 or undefined in non-TTY environments.
	const columns = stdout.columns ?? 0;
	const rows = stdout.rows ?? 0;

	if (Boolean(columns) && Boolean(rows)) {
		return {columns, rows};
	}

	const fallbackSize = getFallbackSize(stdout);

	return {
		columns: resolveDimension(columns, fallbackSize.columns, 80),
		rows: resolveDimension(rows, fallbackSize.rows, 24),
	};
};
