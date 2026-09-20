import {EventEmitter} from 'node:events';
import process from 'node:process';
import React, {
	type ReactNode,
	useState,
	useRef,
	useCallback,
	useMemo,
	useEffect,
	useInsertionEffect,
} from 'react';
import cliCursor from 'cli-cursor';
import {type CursorPosition} from '../log-update.js';
import {createInputParser} from '../input-parser.js';
import parseKeypress from '../parse-keypress.js';
import {getRawModeStream, type OutputStream} from '../stream.js';
import AppContext, {type SuspendTerminal} from './AppContext.js';
import StdinContext from './StdinContext.js';
import StdoutContext from './StdoutContext.js';
import StderrContext from './StderrContext.js';
import FocusContext from './FocusContext.js';
import AnimationContext from './AnimationContext.js';
import CursorContext from './CursorContext.js';
import ErrorBoundary from './ErrorBoundary.js';

type AnimationSubscriber = {
	readonly callback: (currentTime: number) => void;
	readonly interval: number;
	readonly startTime: number;
	nextDueTime: number;
};

type Props = {
	readonly children: ReactNode;
	readonly stdin: NodeJS.ReadableStream;
	readonly stdout: OutputStream;
	readonly stderr: OutputStream;
	readonly writeToStdout: (data: string) => void;
	readonly writeToStderr: (data: string) => void;
	readonly exitOnCtrlC: boolean;
	readonly onExit: (errorOrResult?: unknown) => void;
	readonly onWaitUntilRenderFlush: () => Promise<void>;
	readonly onSuspendTerminal: SuspendTerminal;
	readonly onKittyQueryResponse: () => void;
	readonly onRegisterInputControl: (
		pauseInput: () => void,
		resumeInput: () => void,
	) => void;
	readonly setCursorPosition: (position: CursorPosition | undefined) => void;
	readonly interactive: boolean;
	readonly renderThrottleMs: number;
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
	onWaitUntilRenderFlush,
	onSuspendTerminal,
	onKittyQueryResponse,
	onRegisterInputControl,
	setCursorPosition,
	interactive,
	renderThrottleMs,
}: Props): React.ReactNode {
	const isFocusEnabledRef = useRef(true);
	const [activeFocusId, setActiveFocusId] = useState<string | undefined>(
		undefined,
	);
	// The registry is not rendered. Keep it current without nesting state updates, so focus changes are queued in call order.
	const focusablesRef = useRef<Focusable[]>([]);
	const animationSubscribersRef = useRef(
		new Map<(currentTime: number) => void, AnimationSubscriber>(),
	);
	const animationTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	// Count how many components enabled raw mode to avoid disabling
	// raw mode until all components don't need it anymore
	const rawModeEnabledCount = useRef(0);
	const pendingDisableRawModeRef = useRef(false);
	// Set while suspendTerminal() has handed input to a child process. Input hooks that change while it is set only update the ref counts; resumeInput restores the modes that still have an owner.
	const isInputPausedRef = useRef(false);
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

	const clearAnimationTimer = useCallback((): void => {
		if (!animationTimerRef.current) {
			return;
		}

		clearTimeout(animationTimerRef.current);
		animationTimerRef.current = undefined;
	}, []);

	const scheduleAnimationTick = useCallback((): void => {
		clearAnimationTimer();

		if (animationSubscribersRef.current.size === 0) {
			return;
		}

		let nextDueTime = Number.POSITIVE_INFINITY;

		for (const subscriber of animationSubscribersRef.current.values()) {
			// One shared timer is enough as long as it wakes at the earliest
			// subscriber deadline and lets slower animations skip that tick.
			nextDueTime = Math.min(nextDueTime, subscriber.nextDueTime);
		}

		const delay = Math.max(0, nextDueTime - performance.now());
		animationTimerRef.current = setTimeout(() => {
			animationTimerRef.current = undefined;
			const currentTime = performance.now();

			for (const subscriber of animationSubscribersRef.current.values()) {
				if (currentTime < subscriber.nextDueTime) {
					continue;
				}

				subscriber.callback(currentTime);
				const elapsedTime = currentTime - subscriber.startTime;
				const elapsedFrames = Math.floor(elapsedTime / subscriber.interval) + 1;
				// Advance from elapsed time rather than callback count so delayed
				// ticks catch up instead of stretching the animation timeline.
				subscriber.nextDueTime =
					subscriber.startTime + elapsedFrames * subscriber.interval;
			}

			scheduleAnimationTick();
		}, delay);
		// Keep the timer ref'd while animations are active so `useAnimation()`
		// can drive process lifetime in both interactive and non-interactive apps.
	}, [clearAnimationTimer]);

	const animationSubscribe = useCallback(
		(
			callback: (currentTime: number) => void,
			interval: number,
		): {readonly startTime: number; readonly unsubscribe: () => void} => {
			const startTime = performance.now();
			// The scheduler owns the start timestamp so hooks can derive frames from
			// the exact same origin that determines each subscriber's due time.
			animationSubscribersRef.current.set(callback, {
				callback,
				interval,
				startTime,
				nextDueTime: startTime + interval,
			});
			scheduleAnimationTick();

			return {
				startTime,
				unsubscribe() {
					animationSubscribersRef.current.delete(callback);

					if (animationSubscribersRef.current.size === 0) {
						clearAnimationTimer();
						return;
					}

					scheduleAnimationTick();
				},
			};
		},
		[clearAnimationTimer, scheduleAnimationTick],
	);

	useEffect(() => {
		return () => {
			clearAnimationTimer();
		};
	}, [clearAnimationTimer]);

	const rawModeStdin = getRawModeStream(stdin);
	const isRawModeSupported = rawModeStdin !== undefined;

	const detachReadableListener = useCallback((): void => {
		if (!readableListenerRef.current) {
			return;
		}

		stdin.removeListener('readable', readableListenerRef.current);
		readableListenerRef.current = undefined;
	}, [stdin]);

	const clearInputState = useCallback((): void => {
		inputParserRef.current.reset();
		clearPendingInputFlush();
		detachReadableListener();
	}, [clearPendingInputFlush, detachReadableListener]);

	const disableRawMode = useCallback((): void => {
		if (!rawModeStdin) {
			return;
		}

		pendingDisableRawModeRef.current = false;
		rawModeStdin.setRawMode(false);
		rawModeStdin.unref?.();
		rawModeEnabledCount.current = 0;
		clearInputState();
	}, [rawModeStdin, clearInputState]);

	const handleExit = useCallback(
		(errorOrResult?: unknown): void => {
			if (
				isRawModeSupported &&
				(rawModeEnabledCount.current > 0 || pendingDisableRawModeRef.current)
			) {
				disableRawMode();
			}

			onExit(errorOrResult);
		},
		[isRawModeSupported, disableRawMode, onExit],
	);

	const handleInput = useCallback(
		(input: string): void => {
			const key = parseKeypress(input);

			// Exit on Ctrl+C
			if (
				exitOnCtrlC &&
				key.ctrl &&
				key.name === 'c' &&
				key.eventType !== 'release'
			) {
				handleExit();
				return;
			}

			// Reset focus when there's an active focused component on Esc
			if (
				isFocusEnabledRef.current &&
				key.name === 'escape' &&
				key.eventType !== 'release' &&
				!key.shift &&
				!key.ctrl &&
				!key.meta &&
				key.super !== true &&
				key.hyper !== true
			) {
				setActiveFocusId(undefined);
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
					// Protocol replies are consumed here; bracketed paste stays literal.
					// eslint-disable-next-line no-control-regex
					if (/^\u001B\[\?\d+u$/.test(event)) {
						onKittyQueryResponse();
						continue;
					}

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
	}, [
		stdin,
		emitInput,
		clearPendingInputFlush,
		schedulePendingInputFlush,
		onKittyQueryResponse,
	]);

	const attachReadableListener = useCallback((): void => {
		if (readableListenerRef.current) {
			return;
		}

		// Store the listener reference to avoid stale closure when removing
		readableListenerRef.current = handleReadable;
		stdin.addListener('readable', handleReadable);
	}, [stdin, handleReadable]);

	const handleSetRawMode = useCallback(
		(isEnabled: boolean): void => {
			if (!rawModeStdin) {
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

			rawModeStdin.setEncoding('utf8');

			if (isEnabled) {
				if (rawModeEnabledCount.current === 0) {
					// A same-render component swap may have detached input handling while
					// leaving terminal raw mode enabled until the queued disable runs.
					const isRawModeAlreadyEnabled = pendingDisableRawModeRef.current;
					pendingDisableRawModeRef.current = false;

					if (!isInputPausedRef.current) {
						if (!isRawModeAlreadyEnabled) {
							rawModeStdin.ref?.();
							rawModeStdin.setRawMode(true);
						}

						attachReadableListener();
					}
				}

				rawModeEnabledCount.current++;
				return;
			}

			if (rawModeEnabledCount.current === 0) {
				return;
			}

			if (--rawModeEnabledCount.current === 0) {
				// Nothing to release while suspended: pauseInput already did.
				if (isInputPausedRef.current) {
					return;
				}

				// Stop owning input immediately so pending parser state cannot leak into
				// a replacement `useInput` component mounted in the same React update.
				clearInputState();

				// Defer only the terminal raw-mode teardown so a same-render replacement
				// can keep the process ref and raw mode active without a disable/enable cycle.
				pendingDisableRawModeRef.current = true;
				queueMicrotask(() => {
					if (!pendingDisableRawModeRef.current) {
						return;
					}

					disableRawMode();
				});
			}
		},
		[
			rawModeStdin,
			stdin,
			attachReadableListener,
			clearInputState,
			disableRawMode,
		],
	);

	const handleSetBracketedPasteMode = useCallback(
		(isEnabled: boolean): void => {
			if (!stdout.isTTY) {
				return;
			}

			if (isEnabled) {
				if (
					bracketedPasteModeEnabledCount.current === 0 &&
					!isInputPausedRef.current
				) {
					stdout.write('\u001B[?2004h');
				}

				bracketedPasteModeEnabledCount.current++;
				return;
			}

			if (bracketedPasteModeEnabledCount.current === 0) {
				return;
			}

			if (
				--bracketedPasteModeEnabledCount.current === 0 &&
				!isInputPausedRef.current
			) {
				stdout.write('\u001B[?2004l');
			}
		},
		[stdout],
	);

	// Pausing and resuming leave the ref counts untouched: the React components
	// still "own" raw mode/bracketed paste across the suspension.
	const pauseInput = useCallback((): void => {
		isInputPausedRef.current = true;

		if (bracketedPasteModeEnabledCount.current > 0 && stdout.isTTY) {
			try {
				stdout.write('\u001B[?2004l');
			} catch {}
		}

		if (isRawModeSupported && rawModeEnabledCount.current > 0) {
			rawModeStdin?.setRawMode(false);
			rawModeStdin?.unref?.();
			clearInputState();
		}
	}, [isRawModeSupported, rawModeStdin, stdout, clearInputState]);

	// Hooks may have changed while suspended, so restore only the modes that still have an owner.
	const resumeInput = useCallback((): void => {
		isInputPausedRef.current = false;

		if (isRawModeSupported && rawModeEnabledCount.current > 0) {
			rawModeStdin?.setEncoding('utf8');
			rawModeStdin?.ref?.();
			rawModeStdin?.setRawMode(true);
			attachReadableListener();
		}

		if (bracketedPasteModeEnabledCount.current > 0 && stdout.isTTY) {
			try {
				stdout.write('\u001B[?2004h');
			} catch {}
		}
	}, [isRawModeSupported, rawModeStdin, stdout, attachReadableListener]);

	// Register input pause/resume in an insertion effect: it runs before every
	// passive effect (parent and child), so a child that calls suspendTerminal()
	// from its own effect always finds the input control already registered. A
	// normal effect would run too late (child effects fire before the parent's).
	useInsertionEffect(() => {
		onRegisterInputControl(pauseInput, resumeInput);
	}, [onRegisterInputControl, pauseInput, resumeInput]);

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
		const currentFocusables = focusablesRef.current;
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
	}, [findNextFocusable]);

	const focusPrevious = useCallback((): void => {
		const currentFocusables = focusablesRef.current;
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
	}, [findPreviousFocusable]);

	// Handle tab navigation via effect that subscribes to input events
	useEffect(() => {
		const handleTabNavigation = (input: string): void => {
			if (!isFocusEnabledRef.current || focusablesRef.current.length === 0) {
				return;
			}

			const key = parseKeypress(input);
			if (
				key.name !== 'tab' ||
				key.eventType === 'release' ||
				key.ctrl ||
				key.meta ||
				key.super === true ||
				key.hyper === true
			) {
				return;
			}

			if (key.shift) {
				focusPrevious();
			} else {
				focusNext();
			}
		};

		internal_eventEmitter.current.on('input', handleTabNavigation);
		const emitter = internal_eventEmitter.current;

		return () => {
			emitter.off('input', handleTabNavigation);
		};
	}, [focusNext, focusPrevious]);

	const enableFocus = useCallback((): void => {
		isFocusEnabledRef.current = true;
	}, []);

	const disableFocus = useCallback((): void => {
		isFocusEnabledRef.current = false;
		setActiveFocusId(undefined);
	}, []);

	const focus = useCallback((id: string): void => {
		const hasFocusableId = focusablesRef.current.some(
			focusable => focusable.id === id && focusable.isActive,
		);

		if (hasFocusableId) {
			setActiveFocusId(id);
		}
	}, []);

	const addFocusable = useCallback(
		(id: string, {autoFocus}: {autoFocus: boolean}): void => {
			focusablesRef.current = [...focusablesRef.current, {id, isActive: true}];

			if (autoFocus && isFocusEnabledRef.current) {
				setActiveFocusId(currentActiveFocusId => {
					if (currentActiveFocusId === undefined) {
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

		focusablesRef.current = focusablesRef.current.filter(focusable => {
			return focusable.id !== id;
		});
	}, []);

	const activateFocusable = useCallback((id: string): void => {
		focusablesRef.current = focusablesRef.current.map(focusable => {
			if (focusable.id !== id) {
				return focusable;
			}

			return {id, isActive: true};
		});
	}, []);

	const deactivateFocusable = useCallback((id: string): void => {
		setActiveFocusId(currentActiveFocusId => {
			if (currentActiveFocusId === id) {
				return undefined;
			}

			return currentActiveFocusId;
		});

		focusablesRef.current = focusablesRef.current.map(focusable => {
			if (focusable.id !== id) {
				return focusable;
			}

			return {id, isActive: false};
		});
	}, []);

	// Handle cursor visibility, raw mode, and bracketed paste mode cleanup on unmount
	useEffect(() => {
		return () => {
			const canWriteToStdout = !stdout.destroyed && !stdout.writableEnded;

			if (interactive && canWriteToStdout) {
				cliCursor.show(stdout);
			}

			if (
				isRawModeSupported &&
				(rawModeEnabledCount.current > 0 || pendingDisableRawModeRef.current)
			) {
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
			suspendTerminal: onSuspendTerminal,
		}),
		[handleExit, onWaitUntilRenderFlush, onSuspendTerminal],
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

	const animationContextValue = useMemo(
		() => ({
			renderThrottleMs,
			subscribe: animationSubscribe,
		}),
		[animationSubscribe, renderThrottleMs],
	);

	return (
		<AppContext.Provider value={appContextValue}>
			<StdinContext.Provider value={stdinContextValue}>
				<StdoutContext.Provider value={stdoutContextValue}>
					<StderrContext.Provider value={stderrContextValue}>
						<FocusContext.Provider value={focusContextValue}>
							<AnimationContext.Provider value={animationContextValue}>
								<CursorContext.Provider value={cursorContextValue}>
									<ErrorBoundary onError={handleExit}>{children}</ErrorBoundary>
								</CursorContext.Provider>
							</AnimationContext.Provider>
						</FocusContext.Provider>
					</StderrContext.Provider>
				</StdoutContext.Provider>
			</StdinContext.Provider>
		</AppContext.Provider>
	);
}

App.displayName = 'InternalApp';

export default App;
