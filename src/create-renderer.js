import Yoga from 'yoga-layout-prebuilt';
import widestLine from 'widest-line';
import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import applyStyles from './apply-styles';
import Output from './output';
import {createNode, appendChildNode} from './dom';

const measureText = text => {
	const width = widestLine(text);
	const height = text.split('\n').length;

	return {width, height};
};

// Traverse the node tree, create Yoga nodes and assign styles to each Yoga node
const buildLayout = (node, options) => {
	const {config, terminalWidth, skipStaticElements} = options;
	const yogaNode = Yoga.Node.create(config);
	node.yogaNode = yogaNode;

	const style = node.style || {};

	// Root node of the tree
	if (node.nodeName === 'ROOT') {
		yogaNode.setWidth(terminalWidth);

		if (node.childNodes.length > 0) {
			const childNodes = node.childNodes.filter(childNode => {
				return skipStaticElements ? !childNode.static : true;
			});

			for (const [index, childNode] of Object.entries(childNodes)) {
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
		const childNodes = node.childNodes.filter(childNode => {
			return skipStaticElements ? !childNode.static : true;
		});

		for (const [index, childNode] of Object.entries(childNodes)) {
			const {yogaNode: childYogaNode} = buildLayout(childNode, options);
			yogaNode.insertChild(childYogaNode, index);
		}
	}

	return node;
};

// After nodes are laid out, render each to output object, which later gets rendered to terminal
const renderNodeToOutput = (node, output, offsetX = 0, offsetY = 0, {transformers, skipStaticElements}) => {
	if (node.static && skipStaticElements) {
		return;
	}

	const {yogaNode} = node;

	// Left and top positions in Yoga are relative to their parent node
	const x = offsetX + yogaNode.getComputedLeft();
	const y = offsetY + yogaNode.getComputedTop();

	const width = yogaNode.getComputedWidth();
	const height = yogaNode.getComputedWidth();
	const padding = yogaNode.getComputedPadding(0);
	const margin = yogaNode.getComputedMargin(0);
	const borderTop = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
	const borderRight = yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);
	const borderBottom = yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);
	const borderLeft = yogaNode.getComputedBorder(Yoga.EDGE_LEFT);
	const layout = yogaNode.getComputedLayout();

	const styles = node.style || {}
	const borderStyle = styles.borderStyle || 'round'
	const borderColor = styles.borderColor ? chalk[styles.borderColor] : (a) => (a)
	const box = cliBoxes[borderStyle];

	if (borderTop > 0) {
		const horizontal = box.horizontal.repeat(width - 2);
		output.write(x, y, borderColor(box.topLeft + horizontal + box.topRight), {
			transformers
		});
	}
	if (borderBottom > 0) {
			const horizontal = box.horizontal.repeat(width - 2);
		output.write(x, y + layout.height - 1, borderColor(box.bottomLeft + horizontal + box.bottomRight), {
			transformers
		});
	}
	if (borderLeft > 0) {
		const vertical = box.vertical.repeat(layout.height - 2).split('').join('\n');
		output.write(
			x,
			y + 1,
			borderColor(vertical),
			{
				transformers
			}
		);
	}

	if (borderRight > 0) {
		const vertical = box.vertical.repeat(layout.height - 2).split('').join('\n');
		output.write(
			x + width - 1,
			y + 1,
			borderColor(vertical),
			{
				transformers
			}
		);
	}

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
			transformers: newTransformers,
			skipStaticElements
		});
	}
};

// Since <Static> components can be placed anywhere in the tree, this helper finds and returns them
const getStaticNodes = element => {
	const staticNodes = [];

	for (const childNode of element.childNodes) {
		if (childNode.static) {
			staticNodes.push(childNode);
		}

		if (Array.isArray(childNode.childNodes) && childNode.childNodes.length > 0) {
			staticNodes.push(...getStaticNodes(childNode));
		}
	}

	return staticNodes;
};

// Build layout, apply styles, build text output of all nodes and return it
export default ({terminalWidth}) => {
	const config = Yoga.Config.create();

	// Used to free up memory used by last Yoga node tree
	let lastYogaNode;
	let lastStaticYogaNode;

	return node => {
		if (lastYogaNode) {
			lastYogaNode.freeRecursive();
		}

		if (lastStaticYogaNode) {
			lastStaticYogaNode.freeRecursive();
		}

		const staticElements = getStaticNodes(node);
		if (staticElements.length > 1) {
			if (process.env.NODE_ENV !== 'production') {
				console.error('Warning: There can only be one <Static> component');
			}
		}

		// <Static> component must be built and rendered separately, so that the layout of the other output is unaffected
		let staticOutput;
		if (staticElements.length === 1) {
			const rootNode = createNode('root');
			appendChildNode(rootNode, staticElements[0]);

			const {yogaNode: staticYogaNode} = buildLayout(rootNode, {
				config,
				terminalWidth,
				skipStaticElements: false
			});

			staticYogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

			// Save current Yoga node tree to free up memory later
			lastStaticYogaNode = staticYogaNode;

			staticOutput = new Output({
				width: staticYogaNode.getComputedWidth(),
				height: staticYogaNode.getComputedHeight()
			});

			renderNodeToOutput(rootNode, staticOutput, 0, 0, {
				transformers: [],
				skipStaticElements: false
			});
		}

		const {yogaNode} = buildLayout(node, {
			config,
			terminalWidth,
			skipStaticElements: true
		});

		yogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

		// Save current node tree to free up memory later
		lastYogaNode = yogaNode;

		const output = new Output({
			width: yogaNode.getComputedWidth(),
			height: yogaNode.getComputedHeight()
		});

		renderNodeToOutput(node, output, 0, 0, {
			transformers: [],
			skipStaticElements: true
		});

		return {
			output: output.get(),
			staticOutput: staticOutput ? `${staticOutput.get()}\n` : undefined
		};
	};
};
