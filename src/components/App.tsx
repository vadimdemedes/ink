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
const zeroWidthJoiner = '\u200D';
const extendedPictographic = /\p{Extended_Pictographic}/u;
const combiningMark = /\p{Mark}/u;
const skinToneModifierStart = 127_995;
const skinToneModifierEnd = 127_999;

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
const csiParamByte = /^[\u0020-\u003F]$/;
const maxEscapeDepth = 32;
const graphemeSegmenter =
	typeof Intl.Segmenter === 'function'
		? new Intl.Segmenter(undefined, {granularity: 'grapheme'})
		: undefined;

type GraphemeInfo = {
	readonly segment: string;
	readonly length: number;
};

const codePointLength = (codePoint: number): number =>
	codePoint > 65_535 ? 2 : 1;

const zeroWidthJoinerCodePoint = zeroWidthJoiner.codePointAt(0)!;

const getNextGrapheme = (
	text: string,
	start: number,
): GraphemeInfo | undefined => {
	if (start >= text.length) {
		return undefined;
	}

	if (graphemeSegmenter) {
		const segments = graphemeSegmenter.segment(text.slice(start));
		const iteratorResult = segments[Symbol.iterator]().next();

		if (iteratorResult.done) {
			return undefined;
		}

		const {segment} = iteratorResult.value;
		return {segment, length: segment.length};
	}

	const codePoint = text.codePointAt(start);

	if (codePoint === undefined) {
		return undefined;
	}

	let length = codePointLength(codePoint);

	while (start + length < text.length) {
		const nextCodePoint = text.codePointAt(start + length);

		if (nextCodePoint === undefined) {
			break;
		}

		if (nextCodePoint === zeroWidthJoinerCodePoint) {
			const afterJoiner = text.codePointAt(
				start + length + codePointLength(nextCodePoint),
			);

			if (afterJoiner === undefined) {
				break;
			}

			length += codePointLength(nextCodePoint);
			length += codePointLength(afterJoiner);
			continue;
		}

		const nextChar = String.fromCodePoint(nextCodePoint);

		if (
			combiningMark.test(nextChar) ||
			(nextCodePoint >= skinToneModifierStart &&
				nextCodePoint <= skinToneModifierEnd)
		) {
			length += codePointLength(nextCodePoint);
			continue;
		}

		break;
	}

	return {segment: text.slice(start, start + length), length};
};

const startsWithJoiner = (value: string): boolean =>
	value.codePointAt(0) === zeroWidthJoinerCodePoint;

const shouldHoldGraphemeForContinuation = (value: string): boolean => {
	if (!value) {
		return false;
	}

	if (value.endsWith(zeroWidthJoiner)) {
		return true;
	}

	return extendedPictographic.test(value);
};

type EscapeParseResult =
	| {readonly kind: 'complete'; readonly length: number}
	| {readonly kind: 'incomplete'; readonly length: number}
	| {readonly kind: 'invalid'; readonly length: number};

const createKeypressParser = (
	emit: (output: string) => void,
): KeypressParser => {
	const csiFinalByte = /[\u0040-\u007E]/;
	let carry = '';
	let carryMode: 'none' | 'escape' | 'grapheme' = 'none';
	let escapeImmediate: NodeJS.Immediate | undefined;
	let graphemeImmediate: NodeJS.Immediate | undefined;
	let pendingText = '';
	let inBracketedPaste = false;
	let bracketedBuffer = '';
	const escapeCodePoint = escape.codePointAt(0)!;

	const flushPendingText = (force = false) => {
		if (!pendingText) {
			return;
		}

		if (!force && pendingText.endsWith(zeroWidthJoiner)) {
			return;
		}

		emit(pendingText);
		pendingText = '';
	};

	const emitSequence = (sequence: string) => {
		flushPendingText(true);
		emit(sequence);
	};

	const cancelPendingEscape = () => {
		if (escapeImmediate) {
			clearImmediate(escapeImmediate);
			escapeImmediate = undefined;
		}
	};

	const cancelPendingGrapheme = () => {
		if (graphemeImmediate) {
			clearImmediate(graphemeImmediate);
			graphemeImmediate = undefined;
		}
	};

	const scheduleSingleEscapeDecision = () => {
		cancelPendingEscape();

		// Wait for two turns of the event loop: the first lets pending chunks append,
		// the second runs after same-tick data handlers so we don't beat fresh input.
		escapeImmediate = setImmediate(() => {
			escapeImmediate = setImmediate(() => {
				if (carry === escape) {
					carry = '';
					carryMode = 'none';
					emitSequence(escape);
				}

				escapeImmediate = undefined;
			});
		});
	};

	const schedulePendingGraphemeDecision = () => {
		cancelPendingGrapheme();

		if (carryMode !== 'grapheme' || !carry) {
			return;
		}

		graphemeImmediate = setImmediate(() => {
			if (carryMode === 'grapheme' && carry) {
				pendingText += carry;
				carry = '';
				carryMode = 'none';
				flushPendingText(true);
			}

			graphemeImmediate = undefined;
		});
	};

	const readEscapeSequence = (
		input: string,
		start: number,
		depth = 0,
	): EscapeParseResult => {
		if (depth >= maxEscapeDepth) {
			return {kind: 'invalid', length: 1};
		}

		if (start + 1 >= input.length) {
			return {kind: 'incomplete', length: input.length - start};
		}

		const next = input[start + 1]!;

		if (next === '[') {
			let index = start + 2;

			while (index < input.length) {
				const character = input[index]!;

				if (csiFinalByte.test(character)) {
					return {kind: 'complete', length: index - start + 1};
				}

				if (!csiParamByte.test(character)) {
					return {kind: 'invalid', length: 1};
				}

				index++;
			}

			return {kind: 'incomplete', length: input.length - start};
		}

		if (next === 'O') {
			let index = start + 2;

			while (index < input.length) {
				const character = input[index]!;

				if (csiFinalByte.test(character)) {
					return {kind: 'complete', length: index - start + 1};
				}

				if (!csiParamByte.test(character)) {
					return {kind: 'invalid', length: 1};
				}

				index++;
			}

			return {kind: 'incomplete', length: input.length - start};
		}

		if (next === escape) {
			const nested = readEscapeSequence(input, start + 1, depth + 1);

			if (nested.kind === 'invalid') {
				return nested;
			}

			if (nested.kind === 'incomplete') {
				return {kind: 'incomplete', length: input.length - start};
			}

			return {kind: 'complete', length: 1 + nested.length};
		}

		const grapheme = getNextGrapheme(input, start + 1);

		if (!grapheme) {
			return {kind: 'incomplete', length: input.length - start};
		}

		if (start + 1 + grapheme.length > input.length) {
			return {kind: 'incomplete', length: input.length - start};
		}

		if (
			grapheme.segment.endsWith(zeroWidthJoiner) &&
			start + 1 + grapheme.length >= input.length
		) {
			return {kind: 'incomplete', length: input.length - start};
		}

		return {kind: 'complete', length: 1 + grapheme.length};
	};

	const push = (chunk: string): void => {
		if (!chunk) {
			return;
		}

		cancelPendingEscape();
		cancelPendingGrapheme();

		let nextChunk = chunk;

		if (carryMode === 'grapheme') {
			if (startsWithJoiner(nextChunk)) {
				nextChunk = carry + nextChunk;
				carry = '';
				carryMode = 'none';
			} else {
				pendingText += carry;
				carry = '';
				carryMode = 'none';
				flushPendingText(true);
			}
		}

		if (carryMode === 'escape') {
			nextChunk = carry + nextChunk;
			carry = '';
			carryMode = 'none';
		}

		const input = nextChunk;

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
				emit(bracketedBuffer);
				bracketedBuffer = '';

				emitSequence(bracketedPasteEnd);
				inBracketedPaste = false;
				index = endIndex + bracketedPasteEnd.length;
				continue;
			}

			const codePoint = input.codePointAt(index);

			if (codePoint === undefined) {
				break;
			}

			if (codePoint !== escapeCodePoint) {
				const grapheme = getNextGrapheme(input, index);

				if (!grapheme) {
					pendingText += input.slice(index);
					index = input.length;
					break;
				}

				const {segment, length} = grapheme;
				const atEnd = index + length >= input.length;

				if (atEnd && shouldHoldGraphemeForContinuation(segment)) {
					carry = input.slice(index);
					carryMode = 'grapheme';
					schedulePendingGraphemeDecision();
					break;
				}

				pendingText += segment;
				index += length;
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
				carryMode = 'escape';
				scheduleSingleEscapeDecision();
				index = input.length;
				break;
			}

			const sequence = readEscapeSequence(input, index);

			if (sequence.kind === 'incomplete') {
				carry = input.slice(index);
				carryMode = 'escape';

				if (carry.length > maxCarrySize) {
					flushPendingText(true);
					emit(carry);
					carry = '';
					carryMode = 'none';
				}

				break;
			}

			if (sequence.kind === 'invalid') {
				emitSequence(escape);
				index += 1;
				continue;
			}

			const value = input.slice(index, index + sequence.length);
			emitSequence(value);
			index += sequence.length;
		}

		if (!inBracketedPaste && carryMode === 'none' && index >= input.length) {
			flushPendingText();
		}
	};

	const reset = (): void => {
		cancelPendingEscape();
		cancelPendingGrapheme();
		carry = '';
		carryMode = 'none';
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

	handleStdinError = (): void => {
		this.keypressParser.reset();
	};

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
		this.props.stdin.on('error', this.handleStdinError);
	}

	override componentWillUnmount() {
		cliCursor.show(this.props.stdout);
		this.keypressParser.reset();

		// ignore calling setRawMode on an handle stdin it cannot be called
		if (this.isRawModeSupported()) {
			this.handleSetRawMode(false);
		}

		this.props.stdin.off('error', this.handleStdinError);
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
