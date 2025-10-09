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
Stateful parser that turns input chunks into individual keypresses.

It keeps enough context to join split escape sequences, including bracketed
paste markers and the single-ESC ambiguity.
*/
type KeypressParser = {
	push: (chunk: string) => void;
	reset: () => void;
};

const bracketedPasteStart = '\u001B[200~';
const bracketedPasteEnd = '\u001B[201~';
const maxCarrySize = 4 * 1024;

const createKeypressParser = (
	emit: (output: string) => void,
): KeypressParser => {
	const csiFinalByte = /[\u0040-\u007E]/;
	let carry = '';
	let escapeImmediate: NodeJS.Immediate | undefined;
	let pendingText = '';
	let inBracketedPaste = false;
	let bracketedBuffer = '';

	const flushPendingText = () => {
		if (pendingText) {
			emit(pendingText);
			pendingText = '';
		}
	};

	const emitSequence = (sequence: string) => {
		flushPendingText();
		emit(sequence);
	};

	const cancelPendingEscape = () => {
		if (escapeImmediate) {
			clearImmediate(escapeImmediate);
			escapeImmediate = undefined;
		}
	};

	const scheduleSingleEscapeDecision = () => {
		cancelPendingEscape();
		escapeImmediate = setImmediate(() => {
			if (carry === escape) {
				carry = '';
				emitSequence(escape);
			}

			escapeImmediate = undefined;
		});
	};

	const readEscapeSequence = (
		input: string,
		start: number,
	): {complete: boolean; length: number} => {
		if (start + 1 >= input.length) {
			return {complete: false, length: input.length - start};
		}

		const next = input[start + 1]!;

		if (next === '[') {
			let index = start + 2;

			while (index < input.length && !csiFinalByte.test(input[index]!)) {
				index++;
			}

			if (index >= input.length) {
				return {complete: false, length: input.length - start};
			}

			return {complete: true, length: index - start + 1};
		}

		if (next === 'O') {
			if (start + 2 >= input.length) {
				return {complete: false, length: input.length - start};
			}

			return {complete: true, length: 3};
		}

		if (next === escape) {
			const nested = readEscapeSequence(input, start + 1);

			if (!nested.complete) {
				return {complete: false, length: input.length - start};
			}

			return {complete: true, length: 1 + nested.length};
		}

		const codePoint = input.codePointAt(start + 1)!;
		const charLength = codePoint > 65_535 ? 2 : 1;

		if (start + 1 + charLength > input.length) {
			return {complete: false, length: input.length - start};
		}

		return {complete: true, length: 1 + charLength};
	};

	const push = (chunk: string): void => {
		if (!chunk) {
			return;
		}

		cancelPendingEscape();
		const input = carry + chunk;
		carry = '';

		let index = 0;

		while (index < input.length) {
			if (inBracketedPaste) {
				const endIndex = input.indexOf(bracketedPasteEnd, index);

				if (endIndex === -1) {
					bracketedBuffer += input.slice(index);
					index = input.length;
					break;
				}

				bracketedBuffer += input.slice(index, endIndex);

				if (bracketedBuffer) {
					emit(bracketedBuffer);
					bracketedBuffer = '';
				}

				emitSequence(bracketedPasteEnd);
				inBracketedPaste = false;
				index = endIndex + bracketedPasteEnd.length;
				continue;
			}

			const character = input[index]!;

			if (character !== escape) {
				pendingText += character;
				index++;
				continue;
			}

			if (input.startsWith(bracketedPasteStart, index)) {
				emitSequence(bracketedPasteStart);
				inBracketedPaste = true;
				bracketedBuffer = '';
				index += bracketedPasteStart.length;
				continue;
			}

			const remaining = input.length - index;

			if (remaining === 1) {
				carry = escape;
				scheduleSingleEscapeDecision();
				index = input.length;
				break;
			}

			const sequence = readEscapeSequence(input, index);

			if (!sequence.complete) {
				carry = input.slice(index);

				if (carry.length > maxCarrySize) {
					carry = '';
				}

				break;
			}

			const value = input.slice(index, index + sequence.length);
			emitSequence(value);
			index += sequence.length;
		}

		if (!inBracketedPaste && index >= input.length) {
			flushPendingText();
		}
	};

	const reset = (): void => {
		cancelPendingEscape();
		carry = '';
		pendingText = '';
		inBracketedPaste = false;
		bracketedBuffer = '';
	};

	return {push, reset};
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
	private readonly keypressParser = createKeypressParser(sequence => {
		this.handleInput(sequence);
		this.internal_eventEmitter.emit('input', sequence);
	});

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
		this.keypressParser.reset();

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
			this.keypressParser.reset();
		}
	};

	handleReadable = (): void => {
		let chunk;
		// eslint-disable-next-line @typescript-eslint/ban-types
		while ((chunk = this.props.stdin.read() as string | null) !== null) {
			this.keypressParser.push(chunk);
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
