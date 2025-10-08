import {EventEmitter} from 'node:events';
import process from 'node:process';
import React, {PureComponent, type ReactNode} from 'react';
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

/**
 * Parse a chunk of input into individual keypresses.
 * Handles ANSI escape sequences (arrow keys, function keys, etc.) as single units.
 *
 * @param chunk - The input chunk to parse
 * @returns Array of individual keypresses
 */
const parseKeypresses = (chunk: string): string[] => {
	const keypresses: string[] = [];
	let i = 0;

	while (i < chunk.length) {
		if (chunk[i] === '\u001B') {
			// Escape sequence
			if (i + 1 < chunk.length && chunk[i + 1] === '[') {
				// CSI (Control Sequence Introducer) sequence
				// Format: ESC [ <parameters> <final byte>
				// Read until we find a letter (a-z, A-Z) or ~
				let j = i + 2;
				while (j < chunk.length && !/[a-zA-Z~]/.test(chunk[j]!)) {
					j++;
				}

				if (j < chunk.length) {
					// Found complete sequence
					keypresses.push(chunk.slice(i, j + 1));
					i = j + 1;
				} else {
					// Incomplete sequence - shouldn't happen but handle gracefully
					keypresses.push(chunk.slice(i));
					i = chunk.length;
				}
			} else if (i + 1 < chunk.length && chunk[i + 1] === 'O') {
				// SS3 (Single Shift 3) sequence - typically function keys
				// Format: ESC O <character>
				if (i + 2 < chunk.length) {
					keypresses.push(chunk.slice(i, i + 3));
					i += 3;
				} else {
					// Incomplete sequence
					keypresses.push(chunk.slice(i));
					i = chunk.length;
				}
			} else {
				// Just ESC by itself
				keypresses.push('\u001B');
				i++;
			}
		} else {
			// Regular character
			keypresses.push(chunk[i]!);
			i++;
		}
	}

	return keypresses;
};

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
export default class App extends PureComponent<Props, State> {
	static displayName = 'InternalApp';

	static getDerivedStateFromError(error: Error) {
		return {error};
	}

	override state = {
		isFocusEnabled: true,
		activeFocusId: undefined,
		focusables: [],
		error: undefined,
	};

	// Count how many components enabled raw mode to avoid disabling
	// raw mode until all components don't need it anymore
	rawModeEnabledCount = 0;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	internal_eventEmitter = new EventEmitter();

	// Determines if TTY is supported on the provided stdin
	isRawModeSupported(): boolean {
		return this.props.stdin.isTTY;
	}

	override render() {
		return (
			<AppContext.Provider
				// eslint-disable-next-line react/jsx-no-constructed-context-values
				value={{
					exit: this.handleExit,
				}}
			>
				<StdinContext.Provider
					// eslint-disable-next-line react/jsx-no-constructed-context-values
					value={{
						stdin: this.props.stdin,
						setRawMode: this.handleSetRawMode,
						isRawModeSupported: this.isRawModeSupported(),
						// eslint-disable-next-line @typescript-eslint/naming-convention
						internal_exitOnCtrlC: this.props.exitOnCtrlC,
						// eslint-disable-next-line @typescript-eslint/naming-convention
						internal_eventEmitter: this.internal_eventEmitter,
					}}
				>
					<StdoutContext.Provider
						// eslint-disable-next-line react/jsx-no-constructed-context-values
						value={{
							stdout: this.props.stdout,
							write: this.props.writeToStdout,
						}}
					>
						<StderrContext.Provider
							// eslint-disable-next-line react/jsx-no-constructed-context-values
							value={{
								stderr: this.props.stderr,
								write: this.props.writeToStderr,
							}}
						>
							<FocusContext.Provider
								// eslint-disable-next-line react/jsx-no-constructed-context-values
								value={{
									activeId: this.state.activeFocusId,
									add: this.addFocusable,
									remove: this.removeFocusable,
									activate: this.activateFocusable,
									deactivate: this.deactivateFocusable,
									enableFocus: this.enableFocus,
									disableFocus: this.disableFocus,
									focusNext: this.focusNext,
									focusPrevious: this.focusPrevious,
									focus: this.focus,
								}}
							>
								{this.state.error ? (
									<ErrorOverview error={this.state.error as Error} />
								) : (
									this.props.children
								)}
							</FocusContext.Provider>
						</StderrContext.Provider>
					</StdoutContext.Provider>
				</StdinContext.Provider>
			</AppContext.Provider>
		);
	}

	override componentDidMount() {
		cliCursor.hide(this.props.stdout);
	}

	override componentWillUnmount() {
		cliCursor.show(this.props.stdout);

		// ignore calling setRawMode on an handle stdin it cannot be called
		if (this.isRawModeSupported()) {
			this.handleSetRawMode(false);
		}
	}

	override componentDidCatch(error: Error) {
		this.handleExit(error);
	}

	handleSetRawMode = (isEnabled: boolean): void => {
		const {stdin} = this.props;

		if (!this.isRawModeSupported()) {
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
			if (this.rawModeEnabledCount === 0) {
				stdin.ref();
				stdin.setRawMode(true);
				stdin.addListener('readable', this.handleReadable);
			}

			this.rawModeEnabledCount++;
			return;
		}

		// Disable raw mode only when no components left that are using it
		if (--this.rawModeEnabledCount === 0) {
			stdin.setRawMode(false);
			stdin.removeListener('readable', this.handleReadable);
			stdin.unref();
		}
	};

	handleReadable = (): void => {
		let chunk;
		// eslint-disable-next-line @typescript-eslint/ban-types
		while ((chunk = this.props.stdin.read() as string | null) !== null) {
			const keypresses = parseKeypresses(chunk);
			for (const keypress of keypresses) {
				this.handleInput(keypress);
				this.internal_eventEmitter.emit('input', keypress);
			}
		}
	};

	handleInput = (input: string): void => {
		// Exit on Ctrl+C
		// eslint-disable-next-line unicorn/no-hex-escape
		if (input === '\x03' && this.props.exitOnCtrlC) {
			this.handleExit();
		}

		// Reset focus when there's an active focused component on Esc
		if (input === escape && this.state.activeFocusId) {
			this.setState({
				activeFocusId: undefined,
			});
		}

		if (this.state.isFocusEnabled && this.state.focusables.length > 0) {
			if (input === tab) {
				this.focusNext();
			}

			if (input === shiftTab) {
				this.focusPrevious();
			}
		}
	};

	handleExit = (error?: Error): void => {
		if (this.isRawModeSupported()) {
			this.handleSetRawMode(false);
		}

		this.props.onExit(error);
	};

	enableFocus = (): void => {
		this.setState({
			isFocusEnabled: true,
		});
	};

	disableFocus = (): void => {
		this.setState({
			isFocusEnabled: false,
		});
	};

	focus = (id: string): void => {
		this.setState(previousState => {
			const hasFocusableId = previousState.focusables.some(
				focusable => focusable?.id === id,
			);

			if (!hasFocusableId) {
				return previousState;
			}

			return {activeFocusId: id};
		});
	};

	focusNext = (): void => {
		this.setState(previousState => {
			const firstFocusableId = previousState.focusables.find(
				focusable => focusable.isActive,
			)?.id;
			const nextFocusableId = this.findNextFocusable(previousState);

			return {
				activeFocusId: nextFocusableId ?? firstFocusableId,
			};
		});
	};

	focusPrevious = (): void => {
		this.setState(previousState => {
			const lastFocusableId = previousState.focusables.findLast(
				focusable => focusable.isActive,
			)?.id;
			const previousFocusableId = this.findPreviousFocusable(previousState);

			return {
				activeFocusId: previousFocusableId ?? lastFocusableId,
			};
		});
	};

	addFocusable = (id: string, {autoFocus}: {autoFocus: boolean}): void => {
		this.setState(previousState => {
			let nextFocusId = previousState.activeFocusId;

			if (!nextFocusId && autoFocus) {
				nextFocusId = id;
			}

			return {
				activeFocusId: nextFocusId,
				focusables: [
					...previousState.focusables,
					{
						id,
						isActive: true,
					},
				],
			};
		});
	};

	removeFocusable = (id: string): void => {
		this.setState(previousState => ({
			activeFocusId:
				previousState.activeFocusId === id
					? undefined
					: previousState.activeFocusId,
			focusables: previousState.focusables.filter(focusable => {
				return focusable.id !== id;
			}),
		}));
	};

	activateFocusable = (id: string): void => {
		this.setState(previousState => ({
			focusables: previousState.focusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: true,
				};
			}),
		}));
	};

	deactivateFocusable = (id: string): void => {
		this.setState(previousState => ({
			activeFocusId:
				previousState.activeFocusId === id
					? undefined
					: previousState.activeFocusId,
			focusables: previousState.focusables.map(focusable => {
				if (focusable.id !== id) {
					return focusable;
				}

				return {
					id,
					isActive: false,
				};
			}),
		}));
	};

	findNextFocusable = (state: State): string | undefined => {
		const activeIndex = state.focusables.findIndex(focusable => {
			return focusable.id === state.activeFocusId;
		});

		for (
			let index = activeIndex + 1;
			index < state.focusables.length;
			index++
		) {
			const focusable = state.focusables[index];

			if (focusable?.isActive) {
				return focusable.id;
			}
		}

		return undefined;
	};

	findPreviousFocusable = (state: State): string | undefined => {
		const activeIndex = state.focusables.findIndex(focusable => {
			return focusable.id === state.activeFocusId;
		});

		for (let index = activeIndex - 1; index >= 0; index--) {
			const focusable = state.focusables[index];

			if (focusable?.isActive) {
				return focusable.id;
			}
		}

		return undefined;
	};
}
