import Yoga from 'yoga-layout-prebuilt';
import renderNodeToOutput from '../render-node-to-output';
import calculateWrappedText from '../calculate-wrapped-text';
import Output from './output';
import {setStyle, ExperimentalDOMNode} from './dom';

// Since <Static> components can be placed anywhere in the tree, this helper finds and returns them
const findStaticNode = (node: ExperimentalDOMNode): ExperimentalDOMNode => {
	if (node.unstable__static) {
		return node;
	}

	for (const childNode of node.childNodes) {
		if (childNode.unstable__static) {
			return childNode;
		}

		if (
			Array.isArray(childNode.childNodes) &&
			childNode.childNodes.length > 0
		) {
			return findStaticNode(childNode);
		}
	}
};

export default ({terminalWidth = 100}) => {
	return (node: ExperimentalDOMNode) => {
		setStyle(node, {
			width: terminalWidth
		});

		node.yogaNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
		calculateWrappedText(node);
		node.yogaNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

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

			renderNodeToOutput(staticNode, staticOutput, {
				skipStaticElements: false
			});
		}

		const {output: generatedOutput, height: outputHeight} = output.get();

		return {
			output: generatedOutput,
			outputHeight,
			// Newline at the end is needed, because static output doesn't have one, so
			// interactive output will override last line of static output
			staticOutput: staticOutput ? `${staticOutput.get().output}\n` : undefined
		};
	};
};
