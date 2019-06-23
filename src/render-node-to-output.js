import widestLine from 'widest-line';
import wrapText from './wrap-text';
import getMaxWidth from './get-max-width';

const isAllTextNodes = (documentHelpers, node) => {
	if (node.nodeName === '#text') {
		return true;
	}

	if (node.nodeName === 'SPAN') {
		if (documentHelpers.getTextContent(node)) {
			return true;
		}

		const childNodes = documentHelpers.getChildNodes(node);

		if (Array.isArray(childNodes)) {
			const fn = node => isAllTextNodes(documentHelpers, node);
			return childNodes.every(fn);
		}
	}

	return false;
};

// Squashing text nodes allows to combine multiple text nodes into one and write
// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
// is actually 3 text nodes, which would result 3 writes to `Output`.
//
// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
const squashTextNodes = (documentHelpers, node) => {
	let text = '';

	const childNodes = documentHelpers.getChildNodes(node);

	for (const childNode of childNodes) {
		let nodeText;

		if (childNode.nodeName === '#text') {
			nodeText = childNode.nodeValue;
		}

		if (childNode.nodeName === 'SPAN') {
			nodeText = documentHelpers.getTextContent(childNode) || squashTextNodes(documentHelpers, childNode);
		}

		// Since these text nodes are being concatenated, `Output` instance won't be able to
		// apply children transform, so we have to do it manually here for each text node
		if (childNode.unstable__transformChildren) {
			nodeText = childNode.unstable__transformChildren(nodeText);
		}

		text += nodeText;
	}

	return text;
};

// After nodes are laid out, render each to output object, which later gets rendered to terminal
const renderNodeToOutput = (documentHelpers, node, output, {offsetX = 0, offsetY = 0, transformers = [], skipStaticElements}) => {
	if (node.unstable__static && skipStaticElements) {
		return;
	}

	const {yogaNode} = node;

	// Left and top positions in Yoga are relative to their parent node
	const x = offsetX + yogaNode.getComputedLeft();
	const y = offsetY + yogaNode.getComputedTop();

	// Transformers are functions that transform final text output of each component
	// See Output class for logic that applies transformers
	let newTransformers = transformers;
	if (node.unstable__transformChildren) {
		newTransformers = [node.unstable__transformChildren, ...transformers];
	}

	// Nodes with only text inside
	if (documentHelpers.getTextContent(node)) {
		let text = documentHelpers.getTextContent(node);

		// Since text nodes are always wrapped in an additional node, parent node
		// is where we should look for attributes
		if (node.parentNode && node.parentNode.style && node.parentNode.style.textWrap) {
			const currentWidth = widestLine(text);
			const maxWidth = getMaxWidth(node.parentNode.yogaNode);

			if (currentWidth > maxWidth) {
				text = wrapText(text, maxWidth, {
					textWrap: node.parentNode.style.textWrap
				});
			}
		}

		output.write(x, y, text, {transformers: newTransformers});
		return;
	}

	// Text nodes
	if (node.nodeName === '#text') {
		output.write(x, y, node.nodeValue, {transformers: newTransformers});
		return;
	}

	// Nodes that have other nodes as children
	const childNodes = documentHelpers.getChildNodes(node);
	if (Array.isArray(childNodes) && childNodes.length > 0) {
		const isFlexDirectionRow = node.style.flexDirection === 'row';

		const fn = node => isAllTextNodes(documentHelpers, node);

		if (isFlexDirectionRow && childNodes.every(fn)) {
			let text = squashTextNodes(documentHelpers, node);

			if (node.style.textWrap) {
				const currentWidth = widestLine(text);
				const maxWidth = getMaxWidth(yogaNode);

				if (currentWidth > maxWidth) {
					text = wrapText(text, maxWidth, {
						textWrap: node.style.textWrap
					});
				}
			}

			output.write(x, y, text, {transformers: newTransformers});
			return;
		}

		for (const childNode of childNodes) {
			renderNodeToOutput(documentHelpers, childNode, output, {
				offsetX: x,
				offsetY: y,
				transformers: newTransformers,
				skipStaticElements
			});
		}
	}
};

export default renderNodeToOutput;
