import process from 'node:process';
import instances from './instances.js';

/**
 * Flush any pending renders for the Ink instance associated with the given stdout stream.
 * This forces all throttled renders to complete immediately and waits for stdout to finish writing.
 *
 * This is useful before process exit to ensure all output is displayed, particularly in error handlers.
 *
 * @param stdout - The stdout stream to flush. Defaults to process.stdout.
 * @returns A promise that resolves when all pending output has been flushed.
 *
 * @example
 * ```typescript
 * import {render, flush} from 'ink';
 *
 * const {unmount} = render(<App />);
 *
 * process.on('uncaughtException', async (error) => {
 *   await flush();
 *   console.error(error);
 *   process.exit(1);
 * });
 * ```
 */
const flush = async (
	stdout: NodeJS.WriteStream = process.stdout,
): Promise<void> => {
	const instance = instances.get(stdout);

	if (instance) {
		await instance.flush();
	}
};

export default flush;
