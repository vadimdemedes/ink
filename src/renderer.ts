import Yoga from 'yoga-layout';
import renderNodeToOutput, {
	renderNodeToScreenReaderOutput,
} from './render-node-to-output.js';
import Output from './output.js';
import {type DOMElement} from './dom.js';

type Result = {
	output: string;
	outputHeight: number;
	staticOutput: string;
};

const getVisibleStaticNode = (
	node: DOMElement | undefined,
): DOMElement | undefined => {
	// Static output is rendered separately, so ancestor visibility must be checked explicitly.
	for (let ancestor = node; ancestor; ancestor = ancestor.parentNode) {
		if (ancestor.yogaNode?.getDisplay() === Yoga.DISPLAY_NONE) {
			return undefined;
		}
	}

	return node;
};

const renderer = (node: DOMElement, isScreenReaderEnabled: boolean): Result => {
	if (node.yogaNode) {
		const staticNode = getVisibleStaticNode(node.staticNode);

		if (isScreenReaderEnabled) {
			const output = renderNodeToScreenReaderOutput(node, {
				skipStaticElements: true,
			});

			const outputHeight = output === '' ? 0 : output.split('\n').length;

			let staticOutput = '';

			if (staticNode) {
				staticOutput = renderNodeToScreenReaderOutput(staticNode, {
					skipStaticElements: false,
				});
			}

			return {
				output,
				outputHeight,
				staticOutput: staticOutput ? `${staticOutput}\n` : '',
			};
		}

		const output = new Output({
			width: node.yogaNode.getComputedWidth(),
			height: node.yogaNode.getComputedHeight(),
		});

		renderNodeToOutput(node, output, {
			skipStaticElements: true,
		});

		let staticOutput;

		if (staticNode?.yogaNode) {
			const {yogaNode} = staticNode;
			staticOutput = new Output({
				width:
					yogaNode.getComputedLeft() +
					yogaNode.getComputedWidth() +
					yogaNode.getComputedMargin(Yoga.EDGE_RIGHT),
				height:
					yogaNode.getComputedTop() +
					yogaNode.getComputedHeight() +
					yogaNode.getComputedMargin(Yoga.EDGE_BOTTOM),
			});

			renderNodeToOutput(staticNode, staticOutput, {
				skipStaticElements: false,
			});
		}

		const {output: generatedOutput, height: outputHeight} = output.get();

		return {
			output: generatedOutput,
			outputHeight,
			// Newline at the end is needed, because static output doesn't have one, so
			// interactive output will override last line of static output
			staticOutput:
				staticOutput && staticOutput.height > 0
					? `${staticOutput.get().output}\n`
					: '',
		};
	}

	return {
		output: '',
		outputHeight: 0,
		staticOutput: '',
	};
};

export default renderer;
