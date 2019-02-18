import Yoga from 'yoga-layout-prebuilt';
import widestLine from 'widest-line';
import applyStyles from './apply-styles';

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
				return skipStaticElements ? !childNode.unstable__static : true;
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

	if (Array.isArray(node.childNodes) && node.childNodes.length > 0) {
		const childNodes = node.childNodes.filter(childNode => {
			return skipStaticElements ? !childNode.unstable__static : true;
		});

		for (const [index, childNode] of Object.entries(childNodes)) {
			const {yogaNode: childYogaNode} = buildLayout(childNode, options);
			yogaNode.insertChild(childYogaNode, index);
		}
	}

	return node;
};

export default buildLayout;
