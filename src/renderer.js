import Yoga from 'yoga-layout-prebuilt';
import Output from './output';
import buildLayout from './build-layout';
import renderNodeToOutput from './render-node-to-output';
import measureText from './measure-text';
import wrapText from './wrap-text';
import getMaxWidth from './get-max-width';

// Since we need to know the width of text container to wrap text, we have to calculate layout twice
// This function is executed after first layout calculation to reassign width and height of text nodes
const calculateWrappedText = (documentHelpers, node) => {
	const textContent = documentHelpers.getTextContent(node);
	if (textContent && node.parentNode && node.parentNode.style && typeof node.parentNode.style.textWrap === 'string') {
		const {yogaNode} = node;
		const parentYogaNode = node.parentNode.yogaNode;
		const maxWidth = getMaxWidth(parentYogaNode);
		const currentWidth = yogaNode.getComputedWidth();

		if (currentWidth > maxWidth) {
			const {textWrap} = node.parentNode.style;
			const wrappedText = wrapText(node.textContent, maxWidth, {textWrap});
			const {width, height} = measureText(wrappedText);

			yogaNode.setWidth(width);
			yogaNode.setHeight(height);
		}

		return;
	}

	const childNodes = documentHelpers.getChildNodes(node);

	if (childNodes && childNodes.length > 0) {
		for (const childNode of childNodes) {
			calculateWrappedText(documentHelpers, childNode);
		}
	}
};

// Since <Static> components can be placed anywhere in the tree, this helper finds and returns them
const getStaticNodes = (documentHelpers, element) => {
	const staticNodes = [];

	const elementChildNodes = documentHelpers.getChildNodes(element);

	for (const childNode of elementChildNodes) {
		if (childNode.unstable__static) {
			staticNodes.push(childNode);
		}

		const childNodes = documentHelpers.getChildNodes(childNode);

		if (Array.isArray(childNodes) && childNodes.length > 0) {
			staticNodes.push(...getStaticNodes(documentHelpers, childNode));
		}
	}

	return staticNodes;
};

// Build layout, apply styles, build text output of all nodes and return it
export default ({documentHelpers, terminalWidth}) => {
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

		const staticElements = getStaticNodes(documentHelpers, node);
		if (staticElements.length > 1) {
			if (process.env.NODE_ENV !== 'production') {
				console.error('Warning: There can only be one <Static> component');
			}
		}

		// <Static> component must be built and rendered separately, so that the layout of the other output is unaffected
		let staticOutput;
		if (staticElements.length === 1) {
			const rootNode = documentHelpers.createNode('root');
			documentHelpers.appendStaticNode(rootNode, staticElements[0]);

			const {yogaNode: staticYogaNode} = buildLayout(documentHelpers, rootNode, {
				config,
				terminalWidth,
				skipStaticElements: false
			});

			staticYogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);
			calculateWrappedText(documentHelpers, rootNode);
			staticYogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

			// Save current Yoga node tree to free up memory later
			lastStaticYogaNode = staticYogaNode;

			staticOutput = new Output({
				width: staticYogaNode.getComputedWidth(),
				height: staticYogaNode.getComputedHeight()
			});

			renderNodeToOutput(documentHelpers, rootNode, staticOutput, {skipStaticElements: false});
		}

		const {yogaNode} = buildLayout(documentHelpers, node, {
			config,
			terminalWidth,
			skipStaticElements: true
		});

		yogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);
		calculateWrappedText(documentHelpers, node);
		yogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

		// Save current node tree to free up memory later
		lastYogaNode = yogaNode;

		const output = new Output({
			width: yogaNode.getComputedWidth(),
			height: yogaNode.getComputedHeight()
		});

		renderNodeToOutput(documentHelpers, node, output, {skipStaticElements: true});

		return {
			output: output.get(),
			staticOutput: staticOutput ? `${staticOutput.get()}\n` : undefined
		};
	};
};
