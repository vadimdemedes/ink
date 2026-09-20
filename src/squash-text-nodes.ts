import wrapAnsi from 'wrap-ansi';
import {type DOMElement} from './dom.js';
import sanitizeAnsi from './sanitize-ansi.js';

type SquashedOutput = {
	text: string;
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

	text = sanitizeAnsi(text.replaceAll('\r\n', '\n'));

	// Measurement and styling dependencies understand the ESC forms of these C1 controls.
	text = text.replaceAll('', '[').replaceAll('', ']').replaceAll('', '\\');

	// Expand tabs after combining nested text so measurement and rendering use the same columns.
	if (node.nodeName === 'ink-text' && text.includes('\t')) {
		// NOTE: We need to handle the tabs case separately to make
		// sure we get the string width *after* expanding tabs
		if (cursor !== undefined) {
			cursor = normalizeCursor(text, cursor);
		}

		text = wrapAnsi(text, Number.POSITIVE_INFINITY, {trim: false});
	} else if (node.nodeName === 'ink-text' && cursor !== undefined) {
		cursor = normalizeCursor(text, cursor);
	}

	return {
		text,
		cursorOffset: cursor,
	};
};

const normalizeCursor = (text: string, cursorOffset: number) => {
	const before = text.slice(0, cursorOffset);
	const beforeCursor = wrapAnsi(before, Number.POSITIVE_INFINITY, {
		trim: false,
	});
	return beforeCursor.length - countNewlines(before);
};

const countNewlines = (text: string) => {
	if (text.length === 0) return 0;

	let count = 0;
	let start = -1;
	while (true) {
		start = text.indexOf('\n', start + 1);
		if (start === -1) {
			return count;
		}
		++count;
	}
};

export default squashTextNodes;
