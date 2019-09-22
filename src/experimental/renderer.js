import Yoga from 'yoga-layout-prebuilt';
import renderNodeToOutput from '../render-node-to-output';
import calculateWrappedText from '../calculate-wrapped-text';
import Output from './output';
import {setStyle} from './dom';

// Since <Static> components can be placed anywhere in the tree, this helper finds and returns them
const findStaticNode = node => {
	if (node.unstable__static) {
		return node;
	}

	for (const childNode of node.childNodes) {
		if (childNode.unstable__static) {
			return childNode;
		}

		if (Array.isArray(childNode.childNodes) && childNode.childNodes.length > 0) {
			return findStaticNode(childNode);
		}
	}
};

export default ({terminalWidth = 100}) => {
	return node => {
		setStyle(node, {
			width: terminalWidth
		});

		node.yogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);
		calculateWrappedText(node);
		node.yogaNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

		const output = new Output({
			width: node.yogaNode.getComputedWidth(),
			height: node.yogaNode.getComputedHeight()
		});

		renderNodeToOutput(node, output, {skipStaticElements: true});

		const staticNode = findStaticNode(node);
		let staticOutput;

		if (staticNode) {
			staticOutput = new Output({
				width: staticNode.yogaNode.getComputedWidth(),
				height: staticNode.yogaNode.getComputedHeight()
			});

			renderNodeToOutput(staticNode, staticOutput, {skipStaticElements: false});
		}

		return {
			output: output.get(),
			// Newline at the end is needed, because static output doesn't have one, so
			// interactive output will override last line of static output
			staticOutput: staticOutput ? `${staticOutput.get()}\n` : undefined
		};
	};
};
