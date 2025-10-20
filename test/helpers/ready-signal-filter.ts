/**
 * Filters ready signal tokens from test output.
 * Used by test harnesses to remove the synchronization marker.
 */
export class ReadySignalFilter {
	private isReady = false;

	constructor(private readonly token: string) {}

	/**
	 * Process a data chunk and remove the ready signal if present.
	 * Handles both \r\n and \n line endings.
	 */
	process(data: string): string {
		if (!this.isReady && data.includes(this.token)) {
			this.isReady = true;
			// Remove the ready marker - order matters (check \r\n first)
			data = data
				.replace(`${this.token}\r\n`, '')
				.replace(`${this.token}\n`, '');
		}

		return data;
	}

	/**
	 * Check if the ready signal has been seen.
	 */
	hasSeenSignal(): boolean {
		return this.isReady;
	}
}
