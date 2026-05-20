import {hasAnsiControlCharacters, tokenizeAnsi} from './ansi-tokenizer.js';

const sgrParametersRegex = /^[\d:;]*$/;

// Strip ANSI escape sequences that would conflict with Ink's layout.
// Preserved: SGR sequences (colors, bold, etc. - end with 'm') and
// OSC sequences (hyperlinks, etc. - ESC ] or C1 OSC).
// Stripped: cursor movement, screen clearing, and other control sequences.
const sanitizeAnsi = (text: string): string => {
	if (!hasAnsiControlCharacters(text)) {
		return text;
	}

	let output = '';

	for (const token of tokenizeAnsi(text)) {
		if (token.type === 'text') {
			output += token.value;
			continue;
		}

		// Allow only OSC 8 (hyperlinks); strip all other OSC sequences
		// to prevent title-hijacking (OSC 0/2) and other terminal attacks
		if (
			token.type === 'osc' &&
			(token.value.startsWith('\x1b]8') || token.value.startsWith('\x9d8'))
		) {
			output += token.value;
			continue;
		}

		if (
			token.type === 'csi' &&
			token.finalCharacter === 'm' &&
			token.intermediateString === '' &&
			sgrParametersRegex.test(token.parameterString)
		) {
			output += token.value;
		}
	}

	return output;
};

export default sanitizeAnsi;
