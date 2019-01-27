import Yoga from 'yoga-layout-prebuilt';
import widestLine from 'widest-line';
import applyStyles from './apply-styles';
import Output from './output';

const measureText = text => {
	const width = widestLine(text);
	const height = text.split('\n').length;

	return {width, height};
};

// Traverse the node tree, create Yoga nodes and assign styles to each Yoga node
const buildLayout = (node, options) => {
	const {config, terminalWidth} = options;
	const yogaNode = Yoga.Node.create(config);
	node.yogaNode = yogaNode;

	const style = node.style || {};

	// Root node of the tree
	if (node.nodeName === 'ROOT') {
		yogaNode.setWidth(terminalWidth);

		if (node.childNodes.length > 0) {
			for (const [index, childNode] of Object.entries(node.childNodes)) {
				const childYogaNode = buildLayout(childNode, options).yogaNode;
				yogaNode.insertChild(childYogaNode, index);
			}
		}

		return node;
	}

	// Apply margin, padding, flex, etc styles
	applyStyles(yogaNode, style);

	// Nodes with only text have a child Yoga node dedicated for that text
	if (node.textContent) {
		const {width, height} = measureText(node.textContent);
		yogaNode.setWidth(style.width || width);
		yogaNode.setHeight(style.height || height);

		return node;
	}

	// Text node
	if (node.nodeValue) {
		const {width, height} = measureText(node.nodeValue);
		yogaNode.setWidth(width);
		yogaNode.setHeight(height);

		return node;
	}

	// Nodes with other nodes as children
	if (style.width) {
		yogaNode.setWidth(style.width);
	}

	if (style.height) {
		yogaNode.setHeight(style.height);
	}

	if (node.childNodes.length > 0) {
		for (const [index, childNode] of Object.entries(node.childNodes)) {
			const {yogaNode: childYogaNode} = buildLayout(childNode, options);
			yogaNode.insertChild(childYogaNode, index);
		}
	}

	return node;
};

// After nodes are laid out, render each to output object, which later gets rendered to terminal
const renderNodeToOutput = (node, output, offsetX = 0, offsetY = 0, {transformers}) => {
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
		renderNodeToOutput(childNode, output, x, y, {
			transformers: newTransformers
		});
	}
};

// Build layout, apply styles, build text output of all nodes and return it
export default ({terminalWidth}) => {
	const config = Yoga.Config.create();

	// Used to free up memory used by last Yoga node tree
	let lastYogaNode;

	return node => {
		if (lastYogaNode) {
			lastYogaNode.freeRecursive();
		}

		const {yogaNode} = buildLayout(node, {
			config,
			terminalWidth
		});

		yogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

		// Save current node tree to free up memory later
		lastYogaNode = yogaNode;

		const output = new Output({
			width: yogaNode.getComputedWidth(),
			height: yogaNode.getComputedHeight()
		});

		renderNodeToOutput(node, output, 0, 0, {
			transformers: []
		});

		return output.get();
	};
};
