import {
	CsiToken,
	hasAnsiControlCharacters,
	tokenizeAnsi,
} from './ansi-tokenizer.js';

const sgrParametersRegex = /^[\d:;]*$/;
// Terminals print nothing for C0 controls and DEL, so strip them; tabs and newlines carry layout. ESC and C1 never reach text tokens, the tokenizer owns them.
const controlCharactersRegex = /(?![\t\n])\p{Cc}/gu;
const leadingMarksRegex = /^\p{Mark}+/u;

// @alcalzone/ansi-tokenize only accepts `[0-9;]` SGR parameters and renders anything else as visible cells, so colon sub-parameters are rewritten before layout.
// 256-color and truecolor forms map losslessly to the semicolon form, underline styles (`4:n`) degrade to plain underline, everything else (underline color `58:...`, malformed color forms) is dropped.
const normalizeParameter = (parameter: string): string | undefined => {
	const parts = parameter.split(':');
	if (parts.length === 1) {
		return parameter;
	}

	if (parts[0] === '4') {
		return parts[1] === '0' || parts[1] === '' ? '24' : '4';
	}

	if (parts[0] !== '38' && parts[0] !== '48') {
		return undefined;
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

	return undefined;
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

		if (token.type === 'csi' && isSanitizedCsi(token)) {
			const parameters = token.parameterString
				.split(';')
				.map(parameter => normalizeParameter(parameter))
				.filter(parameter => parameter !== undefined);

			if (parameters.length > 0) {
				pendingStyles += `\u001B[${parameters.join(';')}m`;
			}
		}
	}

	return output + pendingStyles;
};

export const isSanitizedCsi = (token: CsiToken) => {
	return (
		token.finalCharacter === 'm' &&
		token.intermediateString === '' &&
		sgrParametersRegex.test(token.parameterString)
	);
};

export default sanitizeAnsi;
