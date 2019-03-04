// After nodes are laid out, render each to output object, which later gets rendered to terminal
const renderNodeToOutput = (node, output, {offsetX = 0, offsetY = 0, transformers = [], skipStaticElements}) => {
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

	// Text nodes
	const text = node.textContent || node.nodeValue;
	if (text) {
		output.write(x, y, text, {transformers: newTransformers});
		return;
	}

	// Nodes that have other nodes as children
	if (Array.isArray(node.childNodes) && node.childNodes.length > 0) {
		// Squashing text nodes allows to combine multiple text nodes into one and write
		// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
		// is actually 3 text nodes, which would result 3 writes to `Output`.
		//
		// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
		// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
		const isAllTextNodes = node.childNodes.every(childNode => {
			return Boolean(childNode.nodeValue) || (childNode.nodeName === 'SPAN' && Boolean(childNode.textContent));
		});

		if (isAllTextNodes) {
			let text = '';

			for (const childNode of node.childNodes) {
				let nodeText = childNode.nodeValue || childNode.textContent;

				// Since these text nodes are being concatenated, `Output` instance won't be able to
				// apply children transform, so we have to do it manually here for each text node
				if (childNode.unstable__transformChildren) {
					nodeText = childNode.unstable__transformChildren(nodeText);
				}

				text += nodeText;
			}

			output.write(x, y, text, {transformers: newTransformers});
			return;
		}

		for (const childNode of node.childNodes) {
			renderNodeToOutput(childNode, output, {
				offsetX: x,
				offsetY: y,
				transformers: newTransformers,
				skipStaticElements
			});
		}
	}
};

export default renderNodeToOutput;
