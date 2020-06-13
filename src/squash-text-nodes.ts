import type {DOMElement} from './dom';

// Squashing text nodes allows to combine multiple text nodes into one and write
// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
// is actually 3 text nodes, which would result 3 writes to `Output`.
//
// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
const squashTextNodes = (node: DOMElement): string => {
	let text = '';

	if (node.childNodes.length > 0) {
		for (const childNode of node.childNodes) {
			let nodeText = '';

			if (childNode.nodeName === '#text') {
				nodeText = childNode.nodeValue;
			} else {
				if (
					childNode.nodeName === 'SPAN' ||
					childNode.nodeName === 'VIRTUAL-SPAN'
				) {
					nodeText = squashTextNodes(childNode);
				}

				// Since these text nodes are being concatenated, `Output` instance won't be able to
				// apply children transform, so we have to do it manually here for each text node
				if (
					nodeText.length > 0 &&
					typeof childNode.internal_transform === 'function'
				) {
					nodeText = childNode.internal_transform(nodeText);
				}
			}

			text += nodeText;
		}
	}

	return text;
};

export default squashTextNodes;
