/**
 * Kitty Keyboard Protocol Support
 *
 * The Kitty keyboard protocol is a modern terminal keyboard handling specification
 * that addresses limitations in traditional terminal input - specifically the
 * inability to distinguish keys like Shift+Enter from Enter, or Ctrl+I from Tab.
 *
 * Protocol documentation: https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 */

/**
 * Query sequence to check if the terminal supports the Kitty keyboard protocol.
 * Terminals that support the protocol will respond with `CSI ? flags u`.
 */
export const KITTY_QUERY = '\x1b[?u';

/**
 * Enable the Kitty keyboard protocol at level 1 (disambiguate escape codes).
 * This level makes it possible to distinguish special keys that would otherwise
 * be ambiguous in legacy mode.
 */
export const KITTY_ENABLE = '\x1b[>1u';

/**
 * Disable the Kitty keyboard protocol and return to legacy mode.
 */
export const KITTY_DISABLE = '\x1b[<u';

/**
 * Default timeout in milliseconds for protocol detection.
 * If no response is received within this time, the terminal is assumed
 * to not support the Kitty keyboard protocol.
 */
export const KITTY_DETECTION_TIMEOUT_MS = 100;

/**
 * Regex pattern to match the Kitty keyboard protocol query response.
 * The response format is: CSI ? flags u
 * where flags is a number indicating the supported protocol features.
 */
export const KITTY_RESPONSE_PATTERN = /^\x1b\[\?(\d+)u$/;

export type KittyDetectionResult = {
	readonly supported: boolean;
	readonly flags?: number;
};

/**
 * Detects whether the terminal supports the Kitty keyboard protocol.
 *
 * This function sends a query to the terminal and waits for a response.
 * If the terminal supports the protocol, it will respond with the current
 * protocol flags. If no response is received within the timeout period,
 * the terminal is assumed to not support the protocol.
 *
 * @param stdin - The input stream to listen for the response
 * @param stdout - The output stream to send the query
 * @param timeout - Timeout in milliseconds (default: 100ms)
 * @returns Promise resolving to the detection result
 */
export async function isKittySupported(
	stdin: NodeJS.ReadStream,
	stdout: NodeJS.WriteStream,
	timeout: number = KITTY_DETECTION_TIMEOUT_MS,
): Promise<KittyDetectionResult> {
	return new Promise(resolve => {
		// If stdin is not a TTY, we cannot detect protocol support
		if (!stdin.isTTY || !stdout.isTTY) {
			resolve({supported: false});
			return;
		}

		let timeoutId: NodeJS.Timeout | undefined;
		let resolved = false;

		const cleanup = () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = undefined;
			}

			stdin.removeListener('data', onData);
		};

		const onData = (data: Buffer | string) => {
			if (resolved) {
				return;
			}

			const input = typeof data === 'string' ? data : data.toString('utf8');

			// Check if this is a Kitty protocol response
			const match = KITTY_RESPONSE_PATTERN.exec(input);
			if (match) {
				resolved = true;
				cleanup();
				resolve({
					supported: true,
					flags: Number.parseInt(match[1]!, 10),
				});
			}
		};

		// Set up timeout for terminals that don't respond
		timeoutId = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				cleanup();
				resolve({supported: false});
			}
		}, timeout);

		// Listen for response
		stdin.on('data', onData);

		// Send query
		stdout.write(KITTY_QUERY);
	});
}

/**
 * Enables the Kitty keyboard protocol on the terminal.
 *
 * @param stdout - The output stream to write the enable sequence
 */
export function enableKittyProtocol(stdout: NodeJS.WriteStream): void {
	stdout.write(KITTY_ENABLE);
}

/**
 * Disables the Kitty keyboard protocol on the terminal.
 *
 * @param stdout - The output stream to write the disable sequence
 */
export function disableKittyProtocol(stdout: NodeJS.WriteStream): void {
	stdout.write(KITTY_DISABLE);
}
