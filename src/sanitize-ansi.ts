import {hasAnsiControlCharacters, tokenizeAnsi} from './ansi-tokenizer.js';

const sgrParametersRegex = /^[\d:;]*$/;
// Terminals print nothing for C0 controls and DEL, so strip them; tabs and newlines carry layout. ESC and C1 never reach text tokens, the tokenizer owns them.
const controlCharactersRegex = /(?![\t\n])\p{Cc}/gu;
const leadingMarksRegex = /^\p{Mark}+/u;

// The layout dependencies (wrap-ansi, string-width) only understand the legacy semicolon form of 256-color and truecolor SGR parameters, so rewrite the colon form (`38:5:n`, `38:2::r:g:b`) to it.
const normalizeColorParameter = (parameter: string): string => {
	const parts = parameter.split(':');
	if (parts[0] !== '38' && parts[0] !== '48') {
		return parameter;
	}

	if (parts[1] === '5' && parts.length === 3) {
		return parts.join(';');
	}

	if (parts[1] === '2') {
		// Drop an empty or default color space id.
		if (parts.length === 6 && (parts[2] === '' || parts[2] === '0')) {
			parts.splice(2, 1);
		}

		if (parts.length === 5) {
			return parts.join(';');
		}
	}

	return parameter;
};

// Strip ANSI escape sequences that would conflict with Ink's layout.
// Preserved: SGR sequences (colors, bold, etc. - end with 'm') and
// OSC sequences (hyperlinks, etc. - ESC ] or C1 OSC).
// Stripped: cursor movement, screen clearing, and other control sequences.
// Combining marks share their base character's cell, so SGR sequences are deferred until after the marks. Otherwise ANSI tokenization consumes the marks as part of the escape sequence.
const sanitizeAnsi = (text: string): string => {
	if (!hasAnsiControlCharacters(text)) {
		return text.replaceAll(controlCharactersRegex, '');
	}

	let output = '';
	let pendingStyles = '';

	for (const token of tokenizeAnsi(text)) {
		if (token.type === 'text') {
			const value = token.value.replaceAll(controlCharactersRegex, '');
			const marks = leadingMarksRegex.exec(value)?.[0] ?? '';
			output += marks;

			if (value.length > marks.length) {
				output += pendingStyles + value.slice(marks.length);
				pendingStyles = '';
			}

			continue;
		}

		if (token.type === 'osc') {
			output += pendingStyles + token.value;
			pendingStyles = '';
			continue;
		}

		if (
			token.type === 'csi' &&
			token.finalCharacter === 'm' &&
			token.intermediateString === '' &&
			sgrParametersRegex.test(token.parameterString)
		) {
			const parameters = token.parameterString
				.split(';')
				.map(parameter => normalizeColorParameter(parameter))
				.join(';');
			pendingStyles += `\u001B[${parameters}m`;
		}
	}

	return output + pendingStyles;
};

export default sanitizeAnsi;
