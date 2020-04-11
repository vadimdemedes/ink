import Yoga from 'yoga-layout-prebuilt';
import {applyStyles} from './apply-styles';
import {measureText} from './measure-text';
import {DOMNode} from './dom';

interface BuildLayoutOptions {
	config: Yoga.YogaConfig;
	terminalWidth: number;
	skipStaticElements: boolean;
}

// Traverse the node tree, create Yoga nodes and assign styles to each Yoga node
export const buildLayout = (node: DOMNode, options: BuildLayoutOptions) => {
	const {config, terminalWidth, skipStaticElements} = options;
	const yogaNode = Yoga.Node.createWithConfig(config);
	node.yogaNode = yogaNode;

	const {style} = node;

	// Root node of the tree
	if (node.nodeName === 'ROOT') {
		// `terminalWidth` can be `undefined` if env isn't a TTY
		yogaNode.setWidth(terminalWidth || 100);

		if (node.childNodes.length > 0) {
			const childNodes = node.childNodes.filter(childNode => {
				return skipStaticElements ? !childNode.unstable__static : true;
			});

			for (const [index, childNode] of Object.entries(childNodes)) {
				const {yogaNode: childYogaNode} = buildLayout(childNode, options);
				if (childYogaNode) {
					yogaNode.insertChild(childYogaNode, Number.parseInt(index, 10));
				}
			}
		}

		return node;
	}

	// Apply margin, padding, flex, etc styles
	applyStyles(yogaNode, style);

	if (node.nodeName === '#text') {
		// Nodes with only text have a child Yoga node dedicated for that text
		if (node.nodeValue) {
			applySize(yogaNode, node.nodeValue, style.width, style.height);
		}
	} else if (node.textContent) {
		// Nodes with only text have a child Yoga node dedicated for that text
		applySize(yogaNode, node.textContent, style.width, style.height);
	} else {
		const childNodes = node.childNodes.filter(childNode => {
			return skipStaticElements ? !childNode.unstable__static : true;
		});

		for (const [index, childNode] of Object.entries(childNodes)) {
			const {yogaNode: childYogaNode} = buildLayout(childNode, options);
			if (childYogaNode) {
				yogaNode.insertChild(childYogaNode, Number.parseInt(index, 10));
			}
		}
	}

	return node;
};

const applySize = (yogaNode: Yoga.YogaNode, text: string, nodeWidth?: string | number, nodeHeight?: string | number) => {
	const {width, height} = measureText(text);
	yogaNode.setWidth(nodeWidth ?? width);
	yogaNode.setHeight(nodeHeight ?? height);
};
