import {type EventEmitter} from 'node:events';
import process from 'node:process';
import React, {
	type ReactNode,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import cliCursor from 'cli-cursor';
import {createInputParser} from '../../input-parser.js';
import AppContext from '../AppContext.js';

type Props = {
	readonly children: ReactNode;
	readonly stdin: NodeJS.ReadStream;
	readonly stdout: NodeJS.WriteStream;
	readonly exitOnCtrlC: boolean;
	readonly interactive: boolean;
	readonly eventEmitter: EventEmitter;
	readonly onExit: (errorOrResult?: unknown) => void;
	readonly onWaitUntilRenderFlush: () => Promise<void>;
};

function AppContextProvider({
	children,
	stdin,
	stdout,
	exitOnCtrlC,
	interactive,
	eventEmitter,
	onExit,
	onWaitUntilRenderFlush,
}: Props): React.ReactNode {
	// Count how many components enabled raw mode to avoid disabling
	// raw mode until all components don't need it anymore
	const rawModeEnabledCount = useRef(0);
	// Count how many components enabled bracketed paste mode
	const bracketedPasteModeEnabledCount = useRef(0);
	// Each useInput hook adds a listener, so the count can legitimately exceed the default limit of 10.
	eventEmitter.setMaxListeners(Infinity);
	// Store the currently attached readable listener to avoid stale closure issues
	const readableListenerRef = useRef<(() => void) | undefined>(undefined);
	const inputParserRef = useRef(createInputParser());
	const pendingInputFlushRef = useRef<NodeJS.Timeout | undefined>(undefined);
	// Small delay to let chunked escape sequences complete before flushing as literal input.
	const pendingInputFlushDelayMilliseconds = 20;

	const clearPendingInputFlush = useCallback((): void => {
		if (!pendingInputFlushRef.current) {
			return;
		}

		clearTimeout(pendingInputFlushRef.current);
		pendingInputFlushRef.current = undefined;
	}, []);

	// Determines if TTY is supported on the provided stdin
	const isRawModeSupported = stdin.isTTY;

	const detachReadableListener = useCallback((): void => {
		if (!readableListenerRef.current) {
			return;
		}

		stdin.removeListener('readable', readableListenerRef.current);
		readableListenerRef.current = undefined;
	}, [stdin]);

	const disableRawMode = useCallback((): void => {
		stdin.setRawMode(false);
		detachReadableListener();
		stdin.unref();
		rawModeEnabledCount.current = 0;
		inputParserRef.current.reset();
		clearPendingInputFlush();
	}, [stdin, detachReadableListener, clearPendingInputFlush]);

	const handleExit = useCallback(
		(errorOrResult?: unknown): void => {
			if (isRawModeSupported && rawModeEnabledCount.current > 0) {
				disableRawMode();
			}

			onExit(errorOrResult);
		},
		[isRawModeSupported, disableRawMode, onExit],
	);

	const handleInput = useCallback(
		(input: string): void => {
			// Exit on Ctrl+C
			// eslint-disable-next-line unicorn/no-hex-escape
			if (input === '\x03' && exitOnCtrlC) {
				handleExit();
			}
		},
		[exitOnCtrlC, handleExit],
	);

	const emitInput = useCallback(
		(input: string): void => {
			handleInput(input);
			eventEmitter.emit('input', input);
		},
		[handleInput, eventEmitter],
	);

	const schedulePendingInputFlush = useCallback((): void => {
		clearPendingInputFlush();
		pendingInputFlushRef.current = setTimeout(() => {
			pendingInputFlushRef.current = undefined;
			const pendingEscape = inputParserRef.current.flushPendingEscape();
			if (!pendingEscape) {
				return;
			}

			emitInput(pendingEscape);
		}, pendingInputFlushDelayMilliseconds);
	}, [clearPendingInputFlush, emitInput]);

	const handleReadable = useCallback((): void => {
		clearPendingInputFlush();
		let chunk;
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		while ((chunk = stdin.read() as string | null) !== null) {
			const inputEvents = inputParserRef.current.push(chunk);
			for (const event of inputEvents) {
				if (typeof event === 'string') {
					emitInput(event);
				} else {
					// Keep paste on a separate channel from `useInput` so key handlers
					// don't need to branch on mixed key-vs-paste event shapes.
					if (eventEmitter.listenerCount('paste') === 0) {
						emitInput(event.paste);
						continue;
					}

					eventEmitter.emit('paste', event.paste);
				}
			}
		}

		if (inputParserRef.current.hasPendingEscape()) {
			schedulePendingInputFlush();
		}
	}, [
		stdin,
		emitInput,
		clearPendingInputFlush,
		schedulePendingInputFlush,
		eventEmitter,
	]);

	const handleSetRawMode = useCallback(
		(isEnabled: boolean): void => {
			if (!isRawModeSupported) {
				if (stdin === process.stdin) {
					throw new Error(
						'Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported',
					);
				} else {
					throw new Error(
						'Raw mode is not supported on the stdin provided to Ink.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported',
					);
				}
			}

			stdin.setEncoding('utf8');

			if (isEnabled) {
				// Ensure raw mode is enabled only once
				if (rawModeEnabledCount.current === 0) {
					stdin.ref();
					stdin.setRawMode(true);
					// Store the listener reference to avoid stale closure when removing
					readableListenerRef.current = handleReadable;
					stdin.addListener('readable', handleReadable);
				}

				rawModeEnabledCount.current++;
				return;
			}

			// Disable raw mode only when no components left that are using it
			if (rawModeEnabledCount.current === 0) {
				return;
			}

			if (--rawModeEnabledCount.current === 0) {
				disableRawMode();
			}
		},
		[isRawModeSupported, stdin, handleReadable, disableRawMode],
	);

	const handleSetBracketedPasteMode = useCallback(
		(isEnabled: boolean): void => {
			if (!stdout.isTTY) {
				return;
			}

			if (isEnabled) {
				if (bracketedPasteModeEnabledCount.current === 0) {
					stdout.write('\u001B[?2004h');
				}

				bracketedPasteModeEnabledCount.current++;
				return;
			}

			if (bracketedPasteModeEnabledCount.current === 0) {
				return;
			}

			if (--bracketedPasteModeEnabledCount.current === 0) {
				stdout.write('\u001B[?2004l');
			}
		},
		[stdout],
	);

	// Handle cursor visibility, raw mode, and bracketed paste mode cleanup on unmount
	useEffect(() => {
		return () => {
			const canWriteToStdout = !stdout.destroyed && !stdout.writableEnded;

			if (interactive && canWriteToStdout) {
				cliCursor.show(stdout);
			}

			if (isRawModeSupported && rawModeEnabledCount.current > 0) {
				disableRawMode();
			}

			if (bracketedPasteModeEnabledCount.current > 0) {
				if (stdout.isTTY && canWriteToStdout) {
					stdout.write('\u001B[?2004l');
				}

				bracketedPasteModeEnabledCount.current = 0;
			}
		};
	}, [stdout, isRawModeSupported, disableRawMode, interactive]);

	// Memoize context values to prevent unnecessary re-renders
	const appContextValue = useMemo(
		() => ({
			exit: handleExit,
			waitUntilRenderFlush: onWaitUntilRenderFlush,
			stdin,
			handleSetRawMode,
			handleSetBracketedPasteMode,
			isRawModeSupported,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_exitOnCtrlC: exitOnCtrlC,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_eventEmitter: eventEmitter,
		}),
		[
			handleExit,
			onWaitUntilRenderFlush,
			exitOnCtrlC,
			handleSetBracketedPasteMode,
			handleSetRawMode,
			isRawModeSupported,
			stdin,
			eventEmitter,
		],
	);

	return (
		<AppContext.Provider value={appContextValue}>
			{children}
		</AppContext.Provider>
	);
}

AppContextProvider.displayName = 'InternalAppContextProvider';

export default AppContextProvider;
