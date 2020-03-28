import Yoga from 'yoga-layout-prebuilt';
import renderNodeToOutput from '../render-node-to-output';
import calculateWrappedText from '../calculate-wrapped-text';
import Output from './output';
import {setStyle} from './dom';

// Since <Static> components can be placed anywhere in the tree, this helper finds and returns them
const findStaticNodes = node => {
	const nodes = [];

	if (node.unstable__static) {
		nodes.push(node);
	}

	for (const childNode of node.childNodes) {
		if (childNode.unstable__static) {
			nodes.push(childNode);
		}

		if (Array.isArray(childNode.childNodes) && childNode.childNodes.length > 0) {
			nodes.push(...findStaticNodes(childNode));
		}
	}

	return nodes;
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

		let staticErr;
		let staticOut;

		findStaticNodes(node).forEach(staticNode => {
			const staticOutput = new Output({
				width: staticNode.yogaNode.getComputedWidth(),
				height: staticNode.yogaNode.getComputedHeight()
			});

			renderNodeToOutput(staticNode, staticOutput, {skipStaticElements: false});

			if (staticNode.unstable__static === 'stderr') {
				staticErr = staticOutput;
			} else {
				staticOut = staticOutput;
			}
		});

		const {output: generatedOutput, height: outputHeight} = output.get();

		return {
			output: generatedOutput,
			outputHeight,
			// Newline at the end is needed, because static output doesn't have one, so
			// interactive output will override last line of static output
			staticErr: staticErr ? `${staticErr.get().output}\n` : undefined,
			staticOut: staticOut ? `${staticOut.get().output}\n` : undefined
		};
	};
};
