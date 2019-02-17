// After nodes are laid out, render each to output object, which later gets rendered to terminal
const renderNodeToOutput = (node, output, {offsetX = 0, offsetY = 0, transformers = [], skipStaticElements}) => {
	if (node.static && skipStaticElements) {
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
	for (const childNode of node.childNodes) {
		renderNodeToOutput(childNode, output, {
			offsetX: x,
			offsetY: y,
			transformers: newTransformers,
			skipStaticElements
		});
	}
};

export default renderNodeToOutput;
