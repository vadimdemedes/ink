import {EventEmitter} from 'node:events';
import process from 'node:process';
import React, {
	type ReactNode,
	useState,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import cliCursor from 'cli-cursor';
import {type CursorPosition} from '../log-update.js';
import AppContext from './AppContext.js';
import StdinContext from './StdinContext.js';
import StdoutContext from './StdoutContext.js';
import StderrContext from './StderrContext.js';
import FocusContext from './FocusContext.js';
import CursorContext from './CursorContext.js';
import ErrorBoundary from './ErrorBoundary.js';

const tab = '\t';
const shiftTab = '\u001B[Z';
const escape = '\u001B';

type Props = {
	readonly children: ReactNode;
	readonly stdin: NodeJS.ReadStream;
	readonly stdout: NodeJS.WriteStream;
	readonly stderr: NodeJS.WriteStream;
	readonly writeToStdout: (data: string) => void;
	readonly writeToStderr: (data: string) => void;
	readonly exitOnCtrlC: boolean;
	readonly onExit: (error?: Error) => void;
	readonly setCursorPosition: (position: CursorPosition | undefined) => void;
};

type Focusable = {
	readonly id: string;
	readonly isActive: boolean;
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
	setCursorPosition,
}: Props): React.ReactNode {
	const [isFocusEnabled, setIsFocusEnabled] = useState(true);
	const [activeFocusId, setActiveFocusId] = useState<string | undefined>(
		undefined,
	);
	// Focusables array is managed internally via setFocusables callback pattern
	// eslint-disable-next-line react/hook-use-state
	const [, setFocusables] = useState<Focusable[]>([]);
	// Track focusables count for tab navigation check (avoids stale closure)
	const focusablesCountRef = useRef(0);

	// Count how many components enabled raw mode to avoid disabling
	// raw mode until all components don't need it anymore
	const rawModeEnabledCount = useRef(0);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const internal_eventEmitter = useRef(new EventEmitter());
	// Each useInput hook adds a listener, so the count can legitimately exceed the default limit of 10.
	internal_eventEmitter.current.setMaxListeners(Infinity);
	// Store the currently attached readable listener to avoid stale closure issues
	const readableListenerRef = useRef<(() => void) | undefined>(undefined);

	// Determines if TTY is supported on the provided stdin
	const isRawModeSupported = stdin.isTTY;

	const handleExit = useCallback(
		(error?: Error): void => {
			// Disable raw mode on exit - inline to avoid circular dependency
			if (isRawModeSupported && rawModeEnabledCount.current > 0) {
				stdin.setRawMode(false);
				if (readableListenerRef.current) {
					stdin.removeListener('readable', readableListenerRef.current);
					readableListenerRef.current = undefined;
				}

				stdin.unref();
				rawModeEnabledCount.current = 0;
			}

			onExit(error);
		},
		[isRawModeSupported, stdin, onExit],
	);

	const handleInput = useCallback(
		(input: string): void => {
			// Exit on Ctrl+C
			// eslint-disable-next-line unicorn/no-hex-escape
			if (input === '\x03' && exitOnCtrlC) {
				handleExit();
				return;
			}

			// Reset focus when there's an active focused component on Esc
			if (input === escape) {
				setActiveFocusId(currentActiveFocusId => {
					if (currentActiveFocusId) {
						return undefined;
					}

					return currentActiveFocusId;
				});
			}
		},
		[exitOnCtrlC, handleExit],
	);

	const handleReadable = useCallback((): void => {
		let chunk;
		// eslint-disable-next-line @typescript-eslint/ban-types
		while ((chunk = stdin.read() as string | null) !== null) {
			handleInput(chunk);
			internal_eventEmitter.current.emit('input', chunk);
		}
	}, [stdin, handleInput]);

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
			if (--rawModeEnabledCount.current === 0) {
				stdin.setRawMode(false);
				if (readableListenerRef.current) {
					stdin.removeListener('readable', readableListenerRef.current);
					readableListenerRef.current = undefined;
				}

				stdin.unref();
			}
		},
		[isRawModeSupported, stdin, handleReadable],
	);

	// Focus navigation helpers
	const findNextFocusable = useCallback(
		(
			currentFocusables: Focusable[],
			currentActiveFocusId: string | undefined,
		): string | undefined => {
			const activeIndex = currentFocusables.findIndex(focusable => {
				return focusable.id === currentActiveFocusId;
			});

			for (
				let index = activeIndex + 1;
				index < currentFocusables.length;
				index++
			) {
				const focusable = currentFocusables[index];

				if (focusable?.isActive) {
					return focusable.id;
				}
			}

			return undefined;
		},
		[],
	);

	const findPreviousFocusable = useCallback(
		(
			currentFocusables: Focusable[],
			currentActiveFocusId: string | undefined,
		): string | undefined => {
			const activeIndex = currentFocusables.findIndex(focusable => {
				return focusable.id === currentActiveFocusId;
			});

			for (let index = activeIndex - 1; index >= 0; index--) {
				const focusable = currentFocusables[index];

				if (focusable?.isActive) {
					return focusable.id;
				}
			}

			return undefined;
		},
		[],
	);

	const focusNext = useCallback((): void => {
		setFocusables(currentFocusables => {
			setActiveFocusId(currentActiveFocusId => {
				const firstFocusableId = currentFocusables.find(
					focusable => focusable.isActive,
				)?.id;
				const nextFocusableId = findNextFocusable(
					currentFocusables,
					currentActiveFocusId,
				);

				return nextFocusableId ?? firstFocusableId;
			});
			return currentFocusables;
		});
	}, [findNextFocusable]);

	const focusPrevious = useCallback((): void => {
		setFocusables(currentFocusables => {
			setActiveFocusId(currentActiveFocusId => {
				const lastFocusableId = currentFocusables.findLast(
					focusable => focusable.isActive,
				)?.id;
				const previousFocusableId = findPreviousFocusable(
					currentFocusables,
					currentActiveFocusId,
				);

				return previousFocusableId ?? lastFocusableId;
			});
			return currentFocusables;
		});
	}, [findPreviousFocusable]);

	// Handle tab navigation via effect that subscribes to input events
	useEffect(() => {
		const handleTabNavigation = (input: string): void => {
			if (!isFocusEnabled || focusablesCountRef.current === 0) return;

			if (input === tab) {
				focusNext();
			}

			if (input === shiftTab) {
				focusPrevious();
			}
		};

		internal_eventEmitter.current.on('input', handleTabNavigation);
		const emitter = internal_eventEmitter.current;

		return () => {
			emitter.off('input', handleTabNavigation);
		};
	}, [isFocusEnabled, focusNext, focusPrevious]);

	const enableFocus = useCallback((): void => {
		setIsFocusEnabled(true);
	}, []);

	const disableFocus = useCallback((): void => {
		setIsFocusEnabled(false);
	}, []);

	const focus = useCallback((id: string): void => {
		setFocusables(currentFocusables => {
			const hasFocusableId = currentFocusables.some(
				focusable => focusable?.id === id,
			);

			if (hasFocusableId) {
				setActiveFocusId(id);
			}

			return currentFocusables;
		});
	}, []);

	const addFocusable = useCallback(
		(id: string, {autoFocus}: {autoFocus: boolean}): void => {
			setFocusables(currentFocusables => {
				focusablesCountRef.current = currentFocusables.length + 1;

				return [
					...currentFocusables,
					{
						id,
						isActive: true,
					},
				];
			});

			if (autoFocus) {
				setActiveFocusId(currentActiveFocusId => {
					if (!currentActiveFocusId) {
						return id;
					}

					return currentActiveFocusId;
				});
			}
		},
		[],
	);

	const removeFocusable = useCallback((id: string): void => {
		setActiveFocusId(currentActiveFocusId => {
			if (currentActiveFocusId === id) {
				return undefined;
			}

			return currentActiveFocusId;
		});

		setFocusables(currentFocusables => {
			const filtered = currentFocusables.filter(focusable => {
				return focusable.id !== id;
			});
			focusablesCountRef.current = filtered.length;

			return filtered;
		});
	}, []);

	const activateFocusable = useCallback((id: string): void => {
		setFocusables(currentFocusables =>
			currentFocusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: true,
				};
			}),
		);
	}, []);

	const deactivateFocusable = useCallback((id: string): void => {
		setActiveFocusId(currentActiveFocusId => {
			if (currentActiveFocusId === id) {
				return undefined;
			}

			return currentActiveFocusId;
		});

		setFocusables(currentFocusables =>
			currentFocusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: false,
				};
			}),
		);
	}, []);

	// Handle cursor visibility and raw mode cleanup on unmount
	useEffect(() => {
		return () => {
			cliCursor.show(stdout);

			// Disable raw mode on unmount if supported
			if (isRawModeSupported && rawModeEnabledCount.current > 0) {
				stdin.setRawMode(false);
				if (readableListenerRef.current) {
					stdin.removeListener('readable', readableListenerRef.current);
					readableListenerRef.current = undefined;
				}

				stdin.unref();
			}
		};
	}, [stdout, stdin, isRawModeSupported]);

	// Memoize context values to prevent unnecessary re-renders
	const appContextValue = useMemo(
		() => ({
			exit: handleExit,
		}),
		[handleExit],
	);

	const stdinContextValue = useMemo(
		() => ({
			stdin,
			setRawMode: handleSetRawMode,
			isRawModeSupported,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_exitOnCtrlC: exitOnCtrlC,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			internal_eventEmitter: internal_eventEmitter.current,
		}),
		[stdin, handleSetRawMode, isRawModeSupported, exitOnCtrlC],
	);

	const stdoutContextValue = useMemo(
		() => ({
			stdout,
			write: writeToStdout,
		}),
		[stdout, writeToStdout],
	);

	const stderrContextValue = useMemo(
		() => ({
			stderr,
			write: writeToStderr,
		}),
		[stderr, writeToStderr],
	);

	const cursorContextValue = useMemo(
		() => ({
			setCursorPosition,
		}),
		[setCursorPosition],
	);

	const focusContextValue = useMemo(
		() => ({
			activeId: activeFocusId,
			add: addFocusable,
			remove: removeFocusable,
			activate: activateFocusable,
			deactivate: deactivateFocusable,
			enableFocus,
			disableFocus,
			focusNext,
			focusPrevious,
			focus,
		}),
		[
			activeFocusId,
			addFocusable,
			removeFocusable,
			activateFocusable,
			deactivateFocusable,
			enableFocus,
			disableFocus,
			focusNext,
			focusPrevious,
			focus,
		],
	);

	return (
		<AppContext.Provider value={appContextValue}>
			<StdinContext.Provider value={stdinContextValue}>
				<StdoutContext.Provider value={stdoutContextValue}>
					<StderrContext.Provider value={stderrContextValue}>
						<FocusContext.Provider value={focusContextValue}>
							<CursorContext.Provider value={cursorContextValue}>
								<ErrorBoundary onError={handleExit}>{children}</ErrorBoundary>
							</CursorContext.Provider>
						</FocusContext.Provider>
					</StderrContext.Provider>
				</StdoutContext.Provider>
			</StdinContext.Provider>
		</AppContext.Provider>
	);
}

App.displayName = 'InternalApp';

export default App;
