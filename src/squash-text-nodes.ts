import wrapAnsi from 'wrap-ansi';
import {type DOMElement} from './dom.js';
import sanitizeAnsi from './sanitize-ansi.js';
import {tokenizeAnsi} from './ansi-tokenizer.js';

// Combining marks share their base character's cell. Defer SGR changes until after the marks so ANSI tokenization cannot consume them as part of an escape sequence.
const preserveStyledCombiningMarks = (text: string): string => {
	let output = '';
	let pendingStyles = '';

	for (const token of tokenizeAnsi(text)) {
		if (token.type === 'csi' && token.finalCharacter === 'm') {
			pendingStyles += token.value;
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

	if (node.nodeName === 'ink-text' && /\p{Mark}/u.test(text)) {
		text = preserveStyledCombiningMarks(text);
	}

	// Expand tabs after combining nested text so measurement and rendering use the same columns.
	if (node.nodeName === 'ink-text' && text.includes('\t')) {
		text = wrapAnsi(text, Number.POSITIVE_INFINITY, {trim: false});
	}

	return text;
};

export default squashTextNodes;
