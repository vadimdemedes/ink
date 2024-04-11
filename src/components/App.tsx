import {EventEmitter} from 'node:events';
import process from 'node:process';
import React, {
	Component,
	PureComponent,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ReactNode
} from 'react';
import cliCursor from 'cli-cursor';
import AppContext from './AppContext.js';
import StdinContext from './StdinContext.js';
import StdoutContext from './StdoutContext.js';
import StderrContext from './StderrContext.js';
import FocusContext from './FocusContext.js';
import ErrorOverview from './ErrorOverview.js';

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
};

type State = {
	readonly isFocusEnabled: boolean;
	readonly activeFocusId?: string;
	readonly focusables: Focusable[];
	readonly error?: Error;
};

type Focusable = {
	readonly id: string;
	readonly isActive: boolean;
};

// Root component for all Ink apps
// It renders stdin and stdout contexts, so that children can access them if needed
// It also handles Ctrl+C exiting and cursor visibility
export default function App({
	stdin,
	onExit,
	children,
	exitOnCtrlC,
	stderr,
	stdout,
	writeToStderr,
	writeToStdout
}: Props) {
	const rawModeEnabledCountRef = useRef(0);
	const internal_eventEmitterRef = useRef(new EventEmitter());
	const [activeFocusId, setActiveFocusId] = useState<string | undefined>();
	const [isFocusEnabled, setIsFocusEnabled] = useState(true);
	const [focusables, setFocusables] = useState<Focusable[]>([]);

	const isRawModeSupported = stdin.isTTY;

	useEffect(() => {
		cliCursor.hide(stdout);

		return () => {
			cliCursor.show(stdout);

			// ignore calling setRawMode on an handle stdin it cannot be called
			if (isRawModeSupported) {
				handleSetRawMode(false);
			}
		};
	}, [stdout, isRawModeSupported]);

	function handleExit(error?: Error) {
		if (isRawModeSupported) {
			handleSetRawMode(false);
		}

		onExit(error);
	}

	function handleSetRawMode(isEnabled?: boolean) {
		if (!isRawModeSupported) {
			if (stdin === process.stdin) {
				throw new Error(
					'Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported'
				);
			} else {
				throw new Error(
					'Raw mode is not supported on the stdin provided to Ink.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported'
				);
			}
		}

		stdin.setEncoding('utf8');

		if (isEnabled) {
			// Ensure raw mode is enabled only once
			if (rawModeEnabledCountRef.current === 0) {
				stdin.ref();
				stdin.setRawMode(true);
				stdin.addListener('readable', handleReadable);
			}

			rawModeEnabledCountRef.current++;
			return;
		}

		// Disable raw mode only when no components left that are using it
		if (--rawModeEnabledCountRef.current === 0) {
			stdin.setRawMode(false);
			stdin.removeListener('readable', handleReadable);
			stdin.unref();
		}
	}

	// TODO: Do the setStates in this function need to be wrapped in flushSync?
	function handleReadable() {
		let chunk;
		// eslint-disable-next-line @typescript-eslint/ban-types
		while ((chunk = stdin.read() as string | null) !== null) {
			// Exit on Ctrl+C
			// eslint-disable-next-line unicorn/no-hex-escape
			if (chunk === '\x03' && exitOnCtrlC) {
				handleExit();
			}

			// Reset focus when there's an active focused component on Esc
			if (chunk === escape && activeFocusId) {
				setActiveFocusId(undefined);
			}

			if (isFocusEnabled && focusables.length > 0) {
				if (chunk === tab) {
					focusNext();
				}

				if (chunk === shiftTab) {
					focusPrevious();
				}
			}
			internal_eventEmitterRef.current.emit('input', chunk);
		}
	}

	function focus(id: string): void {
		const hasFocusableId = focusables.some(focusable => focusable?.id === id);

		if (!hasFocusableId) {
			return;
		}

		setActiveFocusId(id);
	}

	function focusNext() {
		const firstFocusableId = focusables[0]?.id;
		const nextFocusableId = findNextFocusable(focusables, activeFocusId);
		setActiveFocusId(nextFocusableId ?? firstFocusableId);
	}

	function focusPrevious() {
		const lastFocusableId = focusables.at(-1)?.id;
		const previousFocusableId = findPreviousFocusable(
			focusables,
			activeFocusId
		);
		setActiveFocusId(previousFocusableId ?? lastFocusableId);
	}

	function addFocusable(id: string, {autoFocus}: {autoFocus: boolean}): void {
		let nextFocusId = activeFocusId;
		if (!nextFocusId && autoFocus) {
			nextFocusId = id;
		}
		setActiveFocusId(nextFocusId);
		setFocusables([
			...focusables,
			{
				id,
				isActive: true
			}
		]);
	}

	function removeFocusable(id: string): void {
		setActiveFocusId(activeFocusId === id ? undefined : activeFocusId);
		setFocusables(
			focusables.filter(focusable => {
				return focusable.id !== id;
			})
		);
	}

	function activateFocusable(id: string): void {
		setFocusables(
			focusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: true
				};
			})
		);
	}

	function deactivateFocusable(id: string): void {
		setActiveFocusId(activeFocusId === id ? undefined : activeFocusId);
		setFocusables(
			focusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: false
				};
			})
		);
	}

	function enableFocus(): void {
		setIsFocusEnabled(true);
	}

	function disableFocus(): void {
		setIsFocusEnabled(false);
	}

	return (
		<AppContext.Provider
			value={{
				exit: handleExit
			}}
		>
			<StdinContext.Provider
				// eslint-disable-next-line react/jsx-no-constructed-context-values
				value={{
					stdin: stdin,
					setRawMode: handleSetRawMode,
					isRawModeSupported: isRawModeSupported,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					internal_exitOnCtrlC: exitOnCtrlC,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					internal_eventEmitter: internal_eventEmitterRef.current
				}}
			>
				<StdoutContext.Provider
					// eslint-disable-next-line react/jsx-no-constructed-context-values
					value={{
						stdout: stdout,
						write: writeToStdout
					}}
				>
					<StderrContext.Provider
						// eslint-disable-next-line react/jsx-no-constructed-context-values
						value={{
							stderr: stderr,
							write: writeToStderr
						}}
					>
						<FocusContext.Provider
							// eslint-disable-next-line react/jsx-no-constructed-context-values
							value={{
								activeId: activeFocusId,
								add: addFocusable,
								remove: removeFocusable,
								activate: activateFocusable,
								deactivate: deactivateFocusable,
								enableFocus: enableFocus,
								disableFocus: disableFocus,
								focusNext: focusNext,
								focusPrevious: focusPrevious,
								focus: focus
							}}
						>
							<InternalAppErrorBoundary handleExit={handleExit}>
								{children}
							</InternalAppErrorBoundary>
						</FocusContext.Provider>
					</StderrContext.Provider>
				</StdoutContext.Provider>
			</StdinContext.Provider>
		</AppContext.Provider>
	);
}
App.displayName = 'InternalApp';

function findPreviousFocusable(
	focusables: Focusable[],
	activeFocusId: string | undefined
): string | undefined {
	const activeIndex = focusables.findIndex(focusable => {
		return focusable.id === activeFocusId;
	});

	for (let index = activeIndex - 1; index >= 0; index--) {
		const focusable = focusables[index];

		if (focusable?.isActive) {
			return focusable.id;
		}
	}

	return undefined;
}

function findNextFocusable(
	focusables: Focusable[],
	activeFocusId: string | undefined
): string | undefined {
	const activeIndex = focusables.findIndex(focusable => {
		return focusable.id === activeFocusId;
	});

	for (let index = activeIndex + 1; index < focusables.length; index++) {
		const focusable = focusables[index];

		if (focusable?.isActive) {
			return focusable.id;
		}
	}

	return undefined;
}

type ErrorState = {
	error?: Error;
};

class InternalAppErrorBoundary extends Component<
	{handleExit: (error: Error) => void; children: ReactNode},
	ErrorState
> {
	state = {
		error: undefined
	};

	static getDerivedStateFromError(error: Error) {
		return {error};
	}

	override componentDidCatch(error: Error) {
		this.props.handleExit(error);
	}

	override render() {
		return this.state.error ? (
			<ErrorOverview error={this.state.error} />
		) : (
			this.props.children
		);
	}
}
