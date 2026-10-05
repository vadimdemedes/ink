import stringWidth from 'string-width';
import wrapAnsi from 'wrap-ansi';
import {type DOMElement} from './dom.js';
import sanitizeAnsi from './sanitize-ansi.js';
import {iterateAnsiTokens, type TextToken} from './ansi-tokenizer.js';
import {iterateGraphemeSegments} from './string-utils.js';
import {InlineCursorHelper} from './cursor-helpers.js';

type SquashedOutput = {
	text: string;

	/**
	 The requested cursor *visual* offset (if any) within
	 `text` (that is, ignoring ansi sequences, how many
	 graphemes* need to be skipped past within `text` before
	 placing the cursor).
	 */
	cursorOffset?: number;

	cursor?: InlineCursorHelper;
};

// Squashing text nodes allows to combine multiple text nodes into one and write
// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
// is actually 3 text nodes, which would result 3 writes to `Output`.
//
// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
const squashTextNodes = (node: DOMElement): SquashedOutput => {
	let cursor: number | undefined;
	const cursorHelper = new InlineCursorHelper();
	let text = '';

	for (const childNode of node.childNodes) {
		let nodeText = '';
		let nodeCursor: InlineCursorHelper | undefined;

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
				const {text: childNodeText, cursor: childNodeCursor} =
					squashTextNodes(childNode);
				nodeText = childNodeText;

				if (childNode.internal_cursorOffset !== undefined) {
					// Outer Cursor elements override inner ones
					// NOTE: We don't support explicit offsets, yet
					cursorHelper.setCursorPosition();
				} else if (childNodeCursor !== undefined) {
					nodeCursor = childNodeCursor;
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
		if (nodeCursor === undefined) {
			cursorHelper.append(nodeText);
		} else {
			cursorHelper.appendHelper(nodeCursor);
		}
	}

	if (
		node.childNodes.length === 0 &&
		node.nodeName === 'ink-text' &&
		node.internal_cursorOffset !== undefined
	) {
		// The only valid cursorOffset in this situation is zero; so if it's set it must be zero
		cursor = 0;
		cursorHelper.setCursorPosition();
	}

	// Normalize cursor *before* expanding tabs or sanitizing, since
	// the offset we've built is into the un-sanitized string
	if (cursor !== undefined && node.nodeName === 'ink-text') {
		cursor = normalizeCursor(text, cursor);
	}

	text = sanitizeSquashedText(node, text);
	cursorHelper.transform(toTransform =>
		sanitizeSquashedText(node, toTransform),
	);

	return {
		text,
		cursorOffset: cursor,
		cursor: cursorHelper.hasCursor ? cursorHelper : undefined,
	};
};

const sanitizeSquashedText = (node: DOMElement, text: string) => {
	text = sanitizeAnsi(text.replaceAll('\r\n', '\n'));

	// Measurement and styling dependencies understand the ESC forms of these C1 controls.
	text = text.replaceAll('', '[').replaceAll('', ']').replaceAll('', '\\');

	// Expand tabs after combining nested text so measurement and rendering use the same columns.
	if (node.nodeName === 'ink-text' && text.includes('\t')) {
		text = wrapAnsi(text, Infinity, {trim: false});
	}

	return text;
};

const tabSize = 8;

const normalizeCursor = (text: string, cursorOffset: number) => {
	if (cursorOffset === 0) {
		return 0;
	}

	let visualLength = 0;
	let offsetsToVisit = cursorOffset;

	const visitSegment = (token: TextToken, index: number, segment: string) => {
		switch (segment) {
			// Tabs are expanded to 8 spaces during normalization
			case '\t': {
				const spaces = tabSize - (visualLength % tabSize);

				// NOTE: cursorOffset and visualLength already include 1 for
				// this byte, so we add one fewer than the
				// number of spaces added
				cursorOffset += spaces - 1;
				visualLength += spaces - 1;
				break;
			}

			case '\r': {
				if (token.value[index + 1] === '\n') {
					--cursorOffset;
					break;
				}

				break;
			}

			default: {
				// Nothing special to do
				break;
			}
		}
	};

	const visitText = (token: TextToken) => {
		for (const {index, segment} of iterateGraphemeSegments(token.value)) {
			visualLength += stringWidth(segment);
			visitSegment(token, index, segment);

			if (--offsetsToVisit <= 0) {
				break;
			}
		}
	};

	for (const {token} of iterateAnsiTokens(text)) {
		if (offsetsToVisit <= 0) {
			break;
		}

		if (token.type === 'text') {
			visitText(token);
		}
	}

	return cursorOffset;
};

export default squashTextNodes;
