import wrapAnsi from 'wrap-ansi';
import {type DOMElement} from './dom.js';
import sanitizeAnsi, {isSanitizedCsi} from './sanitize-ansi.js';
import {tokenizeAnsi} from './ansi-tokenizer.js';

type SquashedOutput = {
	text: string;

	/**
	 * The requested cursor offset (if any) within `text`
	 */
	cursorOffset?: number;
};

// Squashing text nodes allows to combine multiple text nodes into one and write
// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
// is actually 3 text nodes, which would result 3 writes to `Output`.
//
// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
const squashTextNodes = (node: DOMElement): SquashedOutput => {
	let cursor: number | undefined;
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
				const {text: newNodeText, cursorOffset} = squashTextNodes(childNode);
				nodeText = newNodeText;
				if (childNode.internal_cursorOffset !== undefined) {
					// Outer Cursor elements override inner ones
					cursor =
						text.length +
						Math.min(newNodeText.length, childNode.internal_cursorOffset);
				} else if (cursorOffset !== undefined) {
					cursor = text.length + cursorOffset;
				}
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

	// Normalize cursor *before* expanding tabs or sanitizing, since
	// the offset we've built is into the un-sanitized string
	if (node.nodeName === 'ink-text' && cursor !== undefined) {
		cursor = normalizeCursor(text, cursor);
	}

	text = sanitizeAnsi(text.replaceAll('\r\n', '\n'));

	// Measurement and styling dependencies understand the ESC forms of these C1 controls.
	text = text.replaceAll('', '[').replaceAll('', ']').replaceAll('', '\\');

	// Expand tabs after combining nested text so measurement and rendering use the same columns.
	if (node.nodeName === 'ink-text' && text.includes('\t')) {
		text = wrapAnsi(text, Number.POSITIVE_INFINITY, {trim: false});
	}

	return {
		text,
		cursorOffset: cursor,
	};
};

const normalizeCursor = (text: string, cursorOffset: number) => {
	const before = text.slice(0, cursorOffset);

	for (const token of tokenizeAnsi(before)) {
		if (token.type === 'csi' && !isSanitizedCsi(token)) {
			cursorOffset -= token.value.length;
		}
	}
	return cursorOffset;
};

export default squashTextNodes;
