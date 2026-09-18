const bellCharacter = '\u{7}';
const escapeCharacter = '\u{1B}';
const stringTerminatorCharacter = '\u{9C}';
const csiCharacter = '\u{9B}';
const oscCharacter = '\u{9D}';
const dcsCharacter = '\u{90}';
const pmCharacter = '\u{9E}';
const apcCharacter = '\u{9F}';
const sosCharacter = '\u{98}';

type ControlStringType = 'osc' | 'dcs' | 'pm' | 'apc' | 'sos';

export type CsiToken = {
	readonly type: 'csi';
	readonly value: string;
	readonly parameterString: string;
	readonly intermediateString: string;
	readonly finalCharacter: string;
};

type EscToken = {
	readonly type: 'esc';
	readonly value: string;
	readonly intermediateString: string;
	readonly finalCharacter: string;
};

type ControlStringToken = {
	readonly type: ControlStringType;
	readonly value: string;
};

type TextToken = {
	readonly type: 'text';
	readonly value: string;
};

type StToken = {
	readonly type: 'st';
	readonly value: string;
};

type C1Token = {
	readonly type: 'c1';
	readonly value: string;
};

type InvalidToken = {
	readonly type: 'invalid';
	readonly value: string;
};

export type AnsiToken =
	| TextToken
	| CsiToken
	| EscToken
	| ControlStringToken
	| StToken
	| C1Token
	| InvalidToken;

const isCsiParameterCharacter = (character: string): boolean => {
	const codePoint = character.codePointAt(0);

	return codePoint !== undefined && codePoint >= 0x30 && codePoint <= 0x3f;
};

const isCsiIntermediateCharacter = (character: string): boolean => {
	const codePoint = character.codePointAt(0);

	return codePoint !== undefined && codePoint >= 0x20 && codePoint <= 0x2f;
};

const isCsiFinalCharacter = (character: string): boolean => {
	const codePoint = character.codePointAt(0);

	return codePoint !== undefined && codePoint >= 0x40 && codePoint <= 0x7e;
};

const isEscapeIntermediateCharacter = (character: string): boolean => {
	const codePoint = character.codePointAt(0);

	return codePoint !== undefined && codePoint >= 0x20 && codePoint <= 0x2f;
};

const isEscapeFinalCharacter = (character: string): boolean => {
	const codePoint = character.codePointAt(0);

	return codePoint !== undefined && codePoint >= 0x30 && codePoint <= 0x7e;
};

const isC1ControlCharacter = (character: string): boolean => {
	const codePoint = character.codePointAt(0);

	return codePoint !== undefined && codePoint >= 0x80 && codePoint <= 0x9f;
};

// Standards references:
// ECMA-48 control functions and CSI byte classes: https://ecma-international.org/publications-and-standards/standards/ecma-48/
// xterm CSI parameter/intermediate/final format notes: https://invisible-island.net/xterm/ecma-48-parameter-format.html
// xterm/OSC BEL termination behavior: https://davidrg.github.io/ckwin/dev/ctlseqs.html
const readCsiSequence = (
	text: string,
	fromIndex: number,
):
	| {
			readonly endIndex: number;
			readonly parameterString: string;
			readonly intermediateString: string;
			readonly finalCharacter: string;
	  }
	| undefined => {
	let index = fromIndex;

	while (index < text.length) {
		const character = text[index]!;

		if (!isCsiParameterCharacter(character)) {
			break;
		}

		index++;
	}

	const parameterString = text.slice(fromIndex, index);
	const intermediateStartIndex = index;

	while (index < text.length) {
		const character = text[index]!;

		if (!isCsiIntermediateCharacter(character)) {
			break;
		}

		index++;
	}

	const intermediateString = text.slice(intermediateStartIndex, index);
	const finalCharacter = text[index];

	if (finalCharacter === undefined || !isCsiFinalCharacter(finalCharacter)) {
		return undefined;
	}

	return {
		endIndex: index + 1,
		parameterString,
		intermediateString,
		finalCharacter,
	};
};

const findControlStringTerminatorIndex = (
	text: string,
	fromIndex: number,
	isBellTerminatorAllowed: boolean,
): number | undefined => {
	for (let index = fromIndex; index < text.length; index++) {
		const character = text[index];

		if (isBellTerminatorAllowed && character === bellCharacter) {
			return index + 1;
		}

		if (character === stringTerminatorCharacter) {
			return index + 1;
		}

		if (character !== escapeCharacter) {
			continue;
		}

		const followingCharacter = text[index + 1];

		// Tmux escapes ESC bytes in payload as ESC ESC.
		if (followingCharacter === escapeCharacter) {
			index++;
			continue;
		}

		if (followingCharacter === '\\') {
			return index + 2;
		}
	}

	return undefined;
};

const readEscapeSequence = (
	text: string,
	fromIndex: number,
):
	| {
			readonly endIndex: number;
			readonly intermediateString: string;
			readonly finalCharacter: string;
	  }
	| undefined => {
	let index = fromIndex;

	while (index < text.length) {
		const character = text[index]!;

		if (!isEscapeIntermediateCharacter(character)) {
			break;
		}

		index++;
	}

	const intermediateString = text.slice(fromIndex, index);
	const finalCharacter = text[index];

	if (finalCharacter === undefined || !isEscapeFinalCharacter(finalCharacter)) {
		return undefined;
	}

	return {
		endIndex: index + 1,
		intermediateString,
		finalCharacter,
	};
};

// Centralize control-string rules so ESC and C1 paths do not diverge.
const getControlStringFromEscapeIntroducer = (
	character: string,
):
	| {
			readonly type: ControlStringType;
			readonly allowBellTerminator: boolean;
	  }
	| undefined => {
	switch (character) {
		case ']': {
			return {type: 'osc', allowBellTerminator: true};
		}

		case 'P': {
			return {type: 'dcs', allowBellTerminator: false};
		}

		case '^': {
			return {type: 'pm', allowBellTerminator: false};
		}

		case '_': {
			return {type: 'apc', allowBellTerminator: false};
		}

		case 'X': {
			return {type: 'sos', allowBellTerminator: false};
		}

		default: {
			return undefined;
		}
	}
};

const getControlStringFromC1Introducer = (
	character: string,
):
	| {
			readonly type: ControlStringType;
			readonly allowBellTerminator: boolean;
	  }
	| undefined => {
	switch (character) {
		case oscCharacter: {
			return {type: 'osc', allowBellTerminator: true};
		}

		case dcsCharacter: {
			return {type: 'dcs', allowBellTerminator: false};
		}

		case pmCharacter: {
			return {type: 'pm', allowBellTerminator: false};
		}

		case apcCharacter: {
			return {type: 'apc', allowBellTerminator: false};
		}

		case sosCharacter: {
			return {type: 'sos', allowBellTerminator: false};
		}

		default: {
			return undefined;
		}
	}
};

export const hasAnsiControlCharacters = (text: string): boolean => {
	if (text.includes(escapeCharacter)) {
		return true;
	}

	for (const character of text) {
		if (isC1ControlCharacter(character)) {
			return true;
		}
	}

	return false;
};

export const tokenizeAnsi = (text: string): AnsiToken[] => {
	const tokens = [];
	for (const {token} of iterateAnsiTokens(text)) {
		tokens.push(token);
	}

	return tokens;
};

function* malformedFromIndex(
	text: string,
	textStartIndex: number,
	fromIndex: number,
): Iterable<{index: number; token: AnsiToken}> {
	if (fromIndex > textStartIndex) {
		yield {
			index: textStartIndex,
			token: {type: 'text', value: text.slice(textStartIndex, fromIndex)},
		};
	}

	// Treat the remainder as invalid so callers can drop it as one unsafe unit.
	yield {
		index: fromIndex,
		token: {type: 'invalid', value: text.slice(fromIndex)},
	};
}

export function* iterateAnsiTokens(
	text: string,
): Iterable<{index: number; token: AnsiToken}> {
	if (!hasAnsiControlCharacters(text)) {
		yield {index: 0, token: {type: 'text', value: text}};
		return;
	}

	let textStartIndex = 0;

	const textUntil = (index: number) => {
		return {
			index: textStartIndex,
			token: {
				type: 'text',
				value: text.slice(textStartIndex, index),
			} satisfies AnsiToken,
		};
	};

	for (let index = 0; index < text.length;) {
		const character = text[index];

		if (character === undefined) {
			break;
		}

		if (character === escapeCharacter) {
			const followingCharacter = text[index + 1];

			if (followingCharacter === undefined) {
				yield* malformedFromIndex(text, textStartIndex, index);
				return;
			}

			if (followingCharacter === '[') {
				const csiSequence = readCsiSequence(text, index + 2);

				if (csiSequence === undefined) {
					yield* malformedFromIndex(text, textStartIndex, index);
					return;
				}

				if (index > textStartIndex) {
					yield textUntil(index);
				}

				yield {
					index,
					token: {
						type: 'csi',
						value: text.slice(index, csiSequence.endIndex),
						parameterString: csiSequence.parameterString,
						intermediateString: csiSequence.intermediateString,
						finalCharacter: csiSequence.finalCharacter,
					},
				};
				index = csiSequence.endIndex;
				textStartIndex = index;
				continue;
			}

			const escapeControlString =
				getControlStringFromEscapeIntroducer(followingCharacter);

			if (escapeControlString !== undefined) {
				const controlStringTerminatorIndex = findControlStringTerminatorIndex(
					text,
					index + 2,
					escapeControlString.allowBellTerminator,
				);

				if (controlStringTerminatorIndex === undefined) {
					yield* malformedFromIndex(text, textStartIndex, index);
					return;
				}

				if (index > textStartIndex) {
					yield textUntil(index);
				}

				yield {
					index,
					token: {
						type: escapeControlString.type,
						value: text.slice(index, controlStringTerminatorIndex),
					},
				};
				index = controlStringTerminatorIndex;
				textStartIndex = index;
				continue;
			}

			const escapeSequence = readEscapeSequence(text, index + 1);

			if (escapeSequence === undefined) {
				// Incomplete escape sequences with intermediates are malformed control strings.
				if (isEscapeIntermediateCharacter(followingCharacter)) {
					yield* malformedFromIndex(text, textStartIndex, index);
					return;
				}

				if (index > textStartIndex) {
					yield textUntil(index);
				}

				// Ignore lone ESC and continue tokenizing the rest.
				index++;
				textStartIndex = index;
				continue;
			}

			if (index > textStartIndex) {
				yield textUntil(index);
			}

			yield {
				index,
				token: {
					type: 'esc',
					value: text.slice(index, escapeSequence.endIndex),
					intermediateString: escapeSequence.intermediateString,
					finalCharacter: escapeSequence.finalCharacter,
				},
			};
			index = escapeSequence.endIndex;
			textStartIndex = index;
			continue;
		}

		if (character === csiCharacter) {
			const csiSequence = readCsiSequence(text, index + 1);

			if (csiSequence === undefined) {
				yield* malformedFromIndex(text, textStartIndex, index);
				return;
			}

			if (index > textStartIndex) {
				yield textUntil(index);
			}

			yield {
				index,
				token: {
					type: 'csi',
					value: text.slice(index, csiSequence.endIndex),
					parameterString: csiSequence.parameterString,
					intermediateString: csiSequence.intermediateString,
					finalCharacter: csiSequence.finalCharacter,
				},
			};
			index = csiSequence.endIndex;
			textStartIndex = index;
			continue;
		}

		const c1ControlString = getControlStringFromC1Introducer(character);

		if (c1ControlString !== undefined) {
			const controlStringTerminatorIndex = findControlStringTerminatorIndex(
				text,
				index + 1,
				c1ControlString.allowBellTerminator,
			);

			if (controlStringTerminatorIndex === undefined) {
				yield* malformedFromIndex(text, textStartIndex, index);
				return;
			}

			if (index > textStartIndex) {
				yield textUntil(index);
			}

			yield {
				index,
				token: {
					type: c1ControlString.type,
					value: text.slice(index, controlStringTerminatorIndex),
				},
			};
			index = controlStringTerminatorIndex;
			textStartIndex = index;
			continue;
		}

		if (character === stringTerminatorCharacter) {
			if (index > textStartIndex) {
				yield textUntil(index);
			}

			yield {index, token: {type: 'st', value: character}};
			index++;
			textStartIndex = index;
			continue;
		}

		// Strip remaining C1 controls as standalone functions.
		if (isC1ControlCharacter(character)) {
			if (index > textStartIndex) {
				yield textUntil(index);
			}

			yield {index, token: {type: 'c1', value: character}};
			index++;
			textStartIndex = index;
			continue;
		}

		index++;
	}

	if (textStartIndex < text.length) {
		yield textUntil(text.length);
	}
}
