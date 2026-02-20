const escape = '\u001B';

type ParsedInput = {
	readonly events: string[];
	readonly pending: string;
};

type ParsedSequence =
	| {
			readonly sequence: string;
			readonly nextIndex: number;
	  }
	| 'pending'
	| undefined;

const isCsiParameterByte = (byte: number): boolean => {
	return byte >= 0x30 && byte <= 0x3f;
};

const isCsiIntermediateByte = (byte: number): boolean => {
	return byte >= 0x20 && byte <= 0x2f;
};

const isCsiFinalByte = (byte: number): boolean => {
	return byte >= 0x40 && byte <= 0x7e;
};

const parseCsiSequence = (
	input: string,
	startIndex: number,
	prefixLength: number,
): ParsedSequence => {
	const csiPayloadStart = startIndex + prefixLength + 1;
	let index = csiPayloadStart;
	for (; index < input.length; index++) {
		const byte = input.codePointAt(index);
		if (byte === undefined) {
			return 'pending';
		}

		if (isCsiParameterByte(byte) || isCsiIntermediateByte(byte)) {
			continue;
		}

		// Preserve legacy terminal function-key sequences like ESC[[A and ESC[[5~.
		if (byte === 0x5b && index === csiPayloadStart) {
			continue;
		}

		if (isCsiFinalByte(byte)) {
			return {
				sequence: input.slice(startIndex, index + 1),
				nextIndex: index + 1,
			};
		}

		return undefined;
	}

	return 'pending';
};

const parseSs3Sequence = (
	input: string,
	startIndex: number,
	prefixLength: number,
): ParsedSequence => {
	const nextIndex = startIndex + prefixLength + 2;
	if (nextIndex > input.length) {
		return 'pending';
	}

	const finalByte = input.codePointAt(nextIndex - 1);
	if (finalByte === undefined || !isCsiFinalByte(finalByte)) {
		return undefined;
	}

	return {
		sequence: input.slice(startIndex, nextIndex),
		nextIndex,
	};
};

const parseControlSequence = (
	input: string,
	startIndex: number,
	prefixLength: number,
): ParsedSequence => {
	const sequenceType = input[startIndex + prefixLength];
	if (sequenceType === undefined) {
		return 'pending';
	}

	if (sequenceType === '[') {
		return parseCsiSequence(input, startIndex, prefixLength);
	}

	if (sequenceType === 'O') {
		return parseSs3Sequence(input, startIndex, prefixLength);
	}

	return undefined;
};

const parseEscapedCodePoint = (
	input: string,
	escapeIndex: number,
): {
	readonly sequence: string;
	readonly nextIndex: number;
} => {
	const nextCodePoint = input.codePointAt(escapeIndex + 1);
	const nextCodePointLength =
		nextCodePoint !== undefined && nextCodePoint > 0xff_ff ? 2 : 1;
	const nextIndex = escapeIndex + 1 + nextCodePointLength;

	return {
		sequence: input.slice(escapeIndex, nextIndex),
		nextIndex,
	};
};

type ParsedEscapeSequence =
	| {
			readonly sequence: string;
			readonly nextIndex: number;
	  }
	| 'pending';

const parseEscapeSequence = (
	input: string,
	escapeIndex: number,
): ParsedEscapeSequence => {
	if (escapeIndex === input.length - 1) {
		return 'pending';
	}

	const next = input[escapeIndex + 1]!;
	if (next === escape) {
		if (escapeIndex + 2 >= input.length) {
			return 'pending';
		}

		const doubleEscapeSequence = parseControlSequence(input, escapeIndex, 2);
		if (doubleEscapeSequence === 'pending') {
			return 'pending';
		}

		if (doubleEscapeSequence) {
			return doubleEscapeSequence;
		}

		return {
			sequence: input.slice(escapeIndex, escapeIndex + 2),
			nextIndex: escapeIndex + 2,
		};
	}

	const controlSequence = parseControlSequence(input, escapeIndex, 1);
	if (controlSequence === 'pending') {
		return 'pending';
	}

	if (controlSequence) {
		return controlSequence;
	}

	return parseEscapedCodePoint(input, escapeIndex);
};

/**
Split a chunk of non-escape text so that delete (0x7F) and backspace (0x08) characters become individual events. When a user holds the delete or backspace key, the terminal sends repeated bytes in a single stdin chunk. Without splitting, `parseKeypress` receives the multi-byte string and fails to recognize it as a key event, corrupting the input state.

Other control characters like `\r` and `\t` are NOT split because they can legitimately appear inside pasted text.
*/
const splitDeleteAndBackspace = (text: string, events: string[]): void => {
	let textSegmentStart = 0;

	for (let index = 0; index < text.length; index++) {
		const character = text[index]!;
		if (character === '\u007F' || character === '\u0008') {
			if (index > textSegmentStart) {
				events.push(text.slice(textSegmentStart, index));
			}

			events.push(character);
			textSegmentStart = index + 1;
		}
	}

	if (textSegmentStart < text.length) {
		events.push(text.slice(textSegmentStart));
	}
};

const parseKeypresses = (input: string): ParsedInput => {
	const events: string[] = [];
	let index = 0;
	const pendingFrom = (pendingStartIndex: number): ParsedInput => ({
		events,
		pending: input.slice(pendingStartIndex),
	});

	while (index < input.length) {
		const escapeIndex = input.indexOf(escape, index);
		if (escapeIndex === -1) {
			splitDeleteAndBackspace(input.slice(index), events);
			return {
				events,
				pending: '',
			};
		}

		if (escapeIndex > index) {
			splitDeleteAndBackspace(input.slice(index, escapeIndex), events);
		}

		const parsedEscapeSequence = parseEscapeSequence(input, escapeIndex);
		if (parsedEscapeSequence === 'pending') {
			return pendingFrom(escapeIndex);
		}

		events.push(parsedEscapeSequence.sequence);
		index = parsedEscapeSequence.nextIndex;
	}

	return {
		events,
		pending: '',
	};
};

export type InputParser = {
	push: (chunk: string) => string[];
	hasPendingEscape: () => boolean;
	flushPendingEscape: () => string | undefined;
	reset: () => void;
};

export const createInputParser = (): InputParser => {
	let pending = '';

	return {
		push(chunk) {
			const parsedInput = parseKeypresses(pending + chunk);
			pending = parsedInput.pending;
			return parsedInput.events;
		},
		hasPendingEscape() {
			return pending.startsWith(escape);
		},
		flushPendingEscape() {
			if (!pending.startsWith(escape)) {
				return undefined;
			}

			const pendingEscape = pending;
			pending = '';
			return pendingEscape;
		},
		reset() {
			pending = '';
		},
	};
};
