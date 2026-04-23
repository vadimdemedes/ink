import {type EventEmitter} from 'node:events';
import process from 'node:process';
import {type InputParser, createInputParser} from '../../input-parser.js';

export default class StdinHelper {
	readonly isRawModeSupported: boolean;
	// eslint-disable-next-line @typescript-eslint/parameter-properties
	private readonly stdin: NodeJS.ReadStream;
	// eslint-disable-next-line @typescript-eslint/parameter-properties
	private readonly eventEmitter: EventEmitter;
	private rawModeEnabledCount: number;
	private readableListener: (() => void) | undefined;
	private readonly inputParser: InputParser;
	private pendingInputFlush: NodeJS.Timeout | undefined;
	private readonly pendingInputFlushDelayMilliseconds: number;
	private readonly onExit: (errorOrResult?: unknown) => void;
	private readonly exitOnCtrlC: boolean;

	constructor(
		stdin: NodeJS.ReadStream,
		eventEmitter: EventEmitter,
		onExit: (errorOrResult?: unknown) => void,
		exitOnCtrlC: boolean,
	) {
		this.stdin = stdin;
		this.eventEmitter = eventEmitter;
		// Each useInput hook adds a listener, so the count can legitimately exceed the default limit of 10.
		this.eventEmitter.setMaxListeners(Infinity);
		// Count how many components enabled raw mode to avoid disabling
		// raw mode until all components don't need it anymore
		this.rawModeEnabledCount = 0;

		// Store the currently attached readable listener to avoid stale closure issues
		this.readableListener = undefined;
		this.inputParser = createInputParser();
		this.pendingInputFlush = undefined;
		// Small delay to let chunked escape sequences complete before flushing as literal input.
		this.pendingInputFlushDelayMilliseconds = 20;
		// Determines if TTY is supported on the provided stdin
		this.isRawModeSupported = stdin.isTTY;
		this.onExit = onExit;
		this.exitOnCtrlC = exitOnCtrlC;
	}

	clearPendingInputFlush(): void {
		if (!this.pendingInputFlush) {
			return;
		}

		clearTimeout(this.pendingInputFlush);
		this.pendingInputFlush = undefined;
	}

	detachReadableListener(): void {
		if (!this.readableListener) {
			return;
		}

		this.stdin.removeListener('readable', this.readableListener);
		this.readableListener = undefined;
	}

	disableRawMode(): void {
		this.stdin.setRawMode(false);
		this.detachReadableListener();
		this.stdin.unref();
		this.rawModeEnabledCount = 0;
		this.inputParser.reset();
		this.clearPendingInputFlush();
	}

	handleExit(errorOrResult?: unknown): void {
		if (this.isRawModeSupported && this.rawModeEnabledCount > 0) {
			this.disableRawMode();
		}

		this.onExit(errorOrResult);
	}

	handleInput(input: string): void {
		// Exit on Ctrl+C
		// eslint-disable-next-line unicorn/no-hex-escape
		if (input === '\x03' && this.exitOnCtrlC) {
			this.handleExit();
		}
	}

	emitInput(input: string): void {
		this.handleInput(input);
		this.eventEmitter.emit('input', input);
	}

	schedulePendingInputFlush(): void {
		this.clearPendingInputFlush();
		this.pendingInputFlush = setTimeout(() => {
			this.pendingInputFlush = undefined;
			const pendingEscape = this.inputParser.flushPendingEscape();
			if (!pendingEscape) {
				return;
			}

			this.emitInput(pendingEscape);
		}, this.pendingInputFlushDelayMilliseconds);
	}

	// Note: Must be an ES6 arrow function, so that when invoked, `this` references
	// this instance, not the eventEmitter.
	// See https://nodejs.org/api/events.html#passing-arguments-and-this-to-listeners
	handleReadable = (): void => {
		this.clearPendingInputFlush();
		let chunk;
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		while ((chunk = this.stdin.read() as string | null) !== null) {
			const inputEvents = this.inputParser.push(chunk);
			for (const event of inputEvents) {
				if (typeof event === 'string') {
					this.emitInput(event);
				} else {
					// Keep paste on a separate channel from `useInput` so key handlers
					// don't need to branch on mixed key-vs-paste event shapes.
					if (this.eventEmitter.listenerCount('paste') === 0) {
						this.emitInput(event.paste);
						continue;
					}

					this.eventEmitter.emit('paste', event.paste);
				}
			}
		}

		if (this.inputParser.hasPendingEscape()) {
			this.schedulePendingInputFlush();
		}
	};

	handleSetRawMode(isEnabled: boolean): void {
		if (!this.isRawModeSupported) {
			if (this.stdin === process.stdin) {
				throw new Error(
					'Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported',
				);
			} else {
				throw new Error(
					'Raw mode is not supported on the stdin provided to Ink.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported',
				);
			}
		}

		this.stdin.setEncoding('utf8');

		if (isEnabled) {
			// Ensure raw mode is enabled only once
			if (this.rawModeEnabledCount === 0) {
				this.stdin.ref();
				this.stdin.setRawMode(true);
				// Store the listener reference to avoid stale closure when removing
				this.readableListener = this.handleReadable;
				this.stdin.addListener('readable', this.handleReadable);
			}

			this.rawModeEnabledCount++;
			return;
		}

		// Disable raw mode only when no components left that are using it
		if (this.rawModeEnabledCount === 0) {
			return;
		}

		if (--this.rawModeEnabledCount === 0) {
			this.disableRawMode();
		}
	}

	handleUnmount() {
		if (this.isRawModeSupported && this.rawModeEnabledCount > 0) {
			this.disableRawMode();
		}
	}
}
