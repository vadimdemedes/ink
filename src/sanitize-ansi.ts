import {hasAnsiControlCharacters, tokenizeAnsi} from './ansi-tokenizer.js';

const sgrParametersRegex = /^[\d:;]*$/;
// Cursor controls in plain text must not move outside the rendered cells.
const cursorControlsRegex = /[\b\v\f\r]/g;

// Strip ANSI escape sequences that would conflict with Ink's layout.
// Preserved: SGR sequences (colors, bold, etc. - end with 'm') and
// OSC sequences (hyperlinks, etc. - ESC ] or C1 OSC).
// Stripped: cursor movement, screen clearing, and other control sequences.
const sanitizeAnsi = (text: string): string => {
	if (!hasAnsiControlCharacters(text)) {
		return text.replaceAll(cursorControlsRegex, '');
	}

	let output = '';

	for (const token of tokenizeAnsi(text)) {
		if (token.type === 'text') {
			output += token.value.replaceAll(cursorControlsRegex, '');
			continue;
		}

		if (token.type === 'osc') {
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
