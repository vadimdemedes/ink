import {EventEmitter} from 'node:events';
import process from 'node:process';
import React, {
	type ReactNode,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import cliCursor from 'cli-cursor';
import {createInputParser} from '../input-parser.js';
import AppContext from './AppContext.js';
import StdinContext from './StdinContext.js';
import StdoutContextProvider from './internal/StdoutContextProvider.js';
import {type Props as StdoutContextProps} from './StdoutContext.js';
import StderrContextProvider from './internal/StderrContextProvider.js';
import {type Props as StderrContextProps} from './StderrContext.js';
import FocusContextProvider from './internal/FocusContextProvider.js';
import AnimationContextProvider from './internal/AnimationContextProvider.js';
import {type AnimationContextValue} from './AnimationContext.js';
import CursorContextProvider from './internal/CursorContextProvider.js';
import {type CursorContextValue} from './CursorContext.js';
import ErrorBoundary from './ErrorBoundary.js';

type Props = {
	readonly children: ReactNode;
	readonly stdin: NodeJS.ReadStream;
	readonly stdout: StdoutContextProps['stdout'];
	readonly stderr: StderrContextProps['stderr'];
	readonly writeToStdout: StdoutContextProps['write'];
	readonly writeToStderr: StderrContextProps['write'];
	readonly exitOnCtrlC: boolean;
	readonly onExit: (errorOrResult?: unknown) => void;
	readonly onWaitUntilRenderFlush: () => Promise<void>;
	readonly setCursorPosition: CursorContextValue['setCursorPosition'];
	readonly interactive: boolean;
	readonly renderThrottleMs: AnimationContextValue['renderThrottleMs'];
};

// Root component for all Ink apps
// It renders stdin and stdout contexts, so that children can access them if needed
// It also handles Ctrl+C exiting and cursor visibility
function App({
	children,
	stdin,
	stdout,
	stderr,
	writeToStdout,
	writeToStderr,
	exitOnCtrlC,
	onExit,
	onWaitUntilRenderFlush,
	setCursorPosition,
	interactive,
	renderThrottleMs,
}: Props): React.ReactNode {
	// Count how many components enabled raw mode to avoid disabling
	// raw mode until all components don't need it anymore
	const rawModeEnabledCount = useRef(0);
	// Count how many components enabled bracketed paste mode
	const bracketedPasteModeEnabledCount = useRef(0);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const internal_eventEmitter = useRef(new EventEmitter());
	// Each useInput hook adds a listener, so the count can legitimately exceed the default limit of 10.
	internal_eventEmitter.current.setMaxListeners(Infinity);
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
			internal_eventEmitter.current.emit('input', input);
		},
		[handleInput],
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
					if (internal_eventEmitter.current.listenerCount('paste') === 0) {
						emitInput(event.paste);
						continue;
					}

					internal_eventEmitter.current.emit('paste', event.paste);
				}
			}
		}

		if (inputParserRef.current.hasPendingEscape()) {
			schedulePendingInputFlush();
		}
	}, [stdin, emitInput, clearPendingInputFlush, schedulePendingInputFlush]);

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
		}),
		[handleExit, onWaitUntilRenderFlush],
	);

	const stdinContextValue = useMemo(
		() => ({
			stdin,
			setRawMode: handleSetRawMode,
			setBracketedPasteMode: handleSetBracketedPasteMode,
			isRawModeSupported,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_exitOnCtrlC: exitOnCtrlC,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_eventEmitter: internal_eventEmitter.current,
		}),
		[
			stdin,
			handleSetRawMode,
			handleSetBracketedPasteMode,
			isRawModeSupported,
			exitOnCtrlC,
		],
	);

	return (
		<AppContext.Provider value={appContextValue}>
			<StdinContext.Provider value={stdinContextValue}>
				<StdoutContextProvider stdout={stdout} writeToStdout={writeToStdout}>
					<StderrContextProvider stderr={stderr} writeToStderr={writeToStderr}>
						<FocusContextProvider eventEmitter={internal_eventEmitter.current}>
							<AnimationContextProvider renderThrottleMs={renderThrottleMs}>
								<CursorContextProvider setCursorPosition={setCursorPosition}>
									<ErrorBoundary onError={handleExit}>{children}</ErrorBoundary>
								</CursorContextProvider>
							</AnimationContextProvider>
						</FocusContextProvider>
					</StderrContextProvider>
				</StdoutContextProvider>
			</StdinContext.Provider>
		</AppContext.Provider>
	);
}

App.displayName = 'InternalApp';

export default App;
