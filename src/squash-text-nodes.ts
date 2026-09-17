import wrapAnsi from 'wrap-ansi';
import {type DOMElement} from './dom.js';
import sanitizeAnsi from './sanitize-ansi.js';
import {tokenizeAnsi} from './ansi-tokenizer.js';

// The layout dependencies (wrap-ansi, slice-ansi) only understand the legacy semicolon form of 256-color and truecolor SGR parameters, so rewrite the colon form (`38:5:n`, `38:2::r:g:b`) to it.
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

// Combining marks share their base character's cell. Defer SGR changes until after the marks so ANSI tokenization cannot consume them as part of an escape sequence.
const normalizeStyledText = (text: string): string => {
	let output = '';
	let pendingStyles = '';

	for (const token of tokenizeAnsi(text)) {
		if (token.type === 'csi' && token.finalCharacter === 'm') {
			const parameters = token.parameterString
				.split(';')
				.map(parameter => normalizeColorParameter(parameter))
				.join(';');
			pendingStyles += `[${parameters}${token.intermediateString}m`;
			continue;
		}

		if (token.type === 'text') {
			const marks = /^\p{Mark}+/u.exec(token.value)?.[0] ?? '';
			output += marks;
			const remainder = token.value.slice(marks.length);
			if (remainder === '') {
				continue;
			}

			output += pendingStyles + remainder;
		} else {
			output += pendingStyles + token.value;
		}

		pendingStyles = '';
	}

	return output + pendingStyles;
};

// Squashing text nodes allows to combine multiple text nodes into one and write
// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
// is actually 3 text nodes, which would result 3 writes to `Output`.
//
// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
const squashTextNodes = (node: DOMElement): string => {
	let text = '';

	for (const childNode of node.childNodes) {
		let nodeText = '';

		if (childNode.nodeName === '#text') {
			nodeText = childNode.nodeValue;
		} else {
			if (childNode.isHidden) {
				continue;
			}

			if (
				childNode.nodeName === 'ink-text' ||
				childNode.nodeName === 'ink-virtual-text'
			) {
				nodeText = squashTextNodes(childNode);
			}

			// Since these text nodes are being concatenated, `Output` instance won't be able to
			// apply children transform, so we have to do it manually here for each text node
			if (
				nodeText.length > 0 &&
				typeof childNode.internal_transform === 'function'
			) {
				const transform = childNode.internal_transform;
				nodeText = nodeText
					.split('\n')
					.map((line, lineIndex) => transform(line, lineIndex))
					.join('\n');
			}
		}

		text += nodeText;
	}

	text = sanitizeAnsi(text.replaceAll('\r\n', '\n'));

	// Measurement and styling dependencies understand the ESC forms of these C1 controls.
	text = text.replaceAll('', '[').replaceAll('', ']').replaceAll('', '\\');

	if (
		node.nodeName === 'ink-text' &&
		(text.includes(':') || /\p{Mark}/u.test(text))
	) {
		text = normalizeStyledText(text);
	}

	// Expand tabs after combining nested text so measurement and rendering use the same columns.
	if (node.nodeName === 'ink-text' && text.includes('\t')) {
		text = wrapAnsi(text, Number.POSITIVE_INFINITY, {trim: false});
	}

	return text;
};

export default squashTextNodes;
