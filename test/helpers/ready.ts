import process from 'node:process';

/**
 * Writes the ready signal to stdout to notify the test harness that Ink has finished rendering.
 * Uses a unique token passed via INK_READY_TOKEN environment variable to avoid collision with test output.
 * Falls back to __INK_READY__ if no token is set (for backward compatibility).
 */
export function writeReadySignal(): void {
	const token = process.env.INK_READY_TOKEN ?? '__INK_READY__';
	process.stdout.write(`${token}\n`);
}
