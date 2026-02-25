import process from 'node:process';
import terminalSize from 'terminal-size';

export const isDev = () => process.env['DEV'] === 'true';

/**
Get the effective terminal dimensions from the given stdout stream.

Falls back to `terminal-size` for columns in piped processes where `stdout.columns` is 0, and uses standard defaults (80×24) when dimensions cannot be determined.
*/
export const getWindowSize = (
	stdout: NodeJS.WriteStream,
): {columns: number; rows: number} => {
	// `stdout.columns`/`rows` can be 0 or undefined in non-TTY environments.
	const {columns, rows} = stdout;

	if (columns && rows) {
		return {columns, rows};
	}

	const fallbackSize = terminalSize();
	return {
		columns: columns || fallbackSize.columns || 80,
		rows: rows || fallbackSize.rows || 24,
	};
};
