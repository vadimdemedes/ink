import cliCursor from 'cli-cursor';

export default class StdoutHelper {
	// eslint-disable-next-line @typescript-eslint/parameter-properties
	private readonly stdout: NodeJS.WriteStream;
	// eslint-disable-next-line @typescript-eslint/parameter-properties
	private readonly interactive: boolean;
	// Count how many components enabled bracketed paste mode
	private bracketedPasteModeEnabledCount: number;

	constructor(stdout: NodeJS.WriteStream, interactive: boolean) {
		this.stdout = stdout;
		this.interactive = interactive;
		this.bracketedPasteModeEnabledCount = 0;
	}

	showCursorIfInteractive(): void {
		const canWriteToStdout =
			!this.stdout.destroyed && !this.stdout.writableEnded;
		if (this.interactive && canWriteToStdout) {
			cliCursor.show(this.stdout);
		}
	}

	disableBracketedPasteMode() {
		const canWriteToStdout =
			!this.stdout.destroyed && !this.stdout.writableEnded;

		if (this.bracketedPasteModeEnabledCount > 0) {
			if (this.stdout.isTTY && canWriteToStdout) {
				this.stdout.write('\u001B[?2004l');
			}

			this.bracketedPasteModeEnabledCount = 0;
		}
	}

	handleSetBracketedPasteMode(isEnabled: boolean) {
		if (!this.stdout.isTTY) {
			return;
		}

		if (isEnabled) {
			if (this.bracketedPasteModeEnabledCount === 0) {
				this.stdout.write('\u001B[?2004h');
			}

			this.bracketedPasteModeEnabledCount++;
			return;
		}

		if (this.bracketedPasteModeEnabledCount === 0) {
			return;
		}

		if (--this.bracketedPasteModeEnabledCount === 0) {
			this.stdout.write('\u001B[?2004l');
		}
	}

	handleUnmount() {
		const canWriteToStdout =
			!this.stdout.destroyed && !this.stdout.writableEnded;

		if (this.interactive && canWriteToStdout) {
			cliCursor.show(this.stdout);
		}

		this.disableBracketedPasteMode();
	}
}
