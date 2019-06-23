import Yoga from 'yoga-layout-prebuilt';
import applyStyles from './apply-styles';
import measureText from './measure-text';

// Traverse the node tree, create Yoga nodes and assign styles to each Yoga node
const buildLayout = (documentHelpers, node, options) => {
	const {config, terminalWidth, skipStaticElements} = options;
	const yogaNode = Yoga.Node.create(config);
	node.yogaNode = yogaNode;

	const style = node.style || {};

	// Root node of the tree
	if (node.nodeName === 'ROOT') {
		// `terminalWidth` can be `undefined` if env isn't a TTY
		yogaNode.setWidth(terminalWidth || 100);

		const childNodes1 = documentHelpers.getChildNodes(node);

		if (childNodes1.length > 0) {
			const childNodes = childNodes1.filter(childNode => {
				return skipStaticElements ? !childNode.unstable__static : true;
			});

			for (const [index, childNode] of Object.entries(childNodes)) {
				const childYogaNode = buildLayout(documentHelpers, childNode, options).yogaNode;
				yogaNode.insertChild(childYogaNode, index);
			}
		}

		return node;
	}

	// Apply margin, padding, flex, etc styles
	applyStyles(yogaNode, style);

	// Nodes with only text have a child Yoga node dedicated for that text
	const textContent = documentHelpers.getTextContent(node);
	if (textContent || node.nodeValue) {
		const {width, height} = measureText(textContent || node.nodeValue);
		yogaNode.setWidth(style.width || width);
		yogaNode.setHeight(style.height || height);

		return node;
	}

	const childNodes1 = documentHelpers.getChildNodes(node);

	if (Array.isArray(childNodes1) && childNodes1.length > 0) {
		const childNodes = childNodes1.filter(childNode => {
			return skipStaticElements ? !childNode.unstable__static : true;
		});

		for (const [index, childNode] of Object.entries(childNodes)) {
			const {yogaNode: childYogaNode} = buildLayout(documentHelpers, childNode, options);
			yogaNode.insertChild(childYogaNode, index);
		}
	}

	return node;
};

export default buildLayout;
