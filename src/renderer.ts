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

// Renders only the `<Static>` output, so it can be collected without rendering the frame.
export const renderStaticOutput = (
	node: DOMElement,
	isScreenReaderEnabled: boolean,
): string => {
	const staticNode = node.yogaNode
		? getVisibleStaticNode(node.staticNode)
		: undefined;

	if (!staticNode) {
		return '';
	}

	if (isScreenReaderEnabled) {
		const staticOutput = renderNodeToScreenReaderOutput(staticNode, {
			skipStaticElements: false,
		});

		return staticOutput === '' ? '' : `${staticOutput}\n`;
	}

	const {yogaNode} = staticNode;
	if (!yogaNode) {
		return '';
	}

	const staticOutput = new Output({
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

	// Newline at the end is needed, because static output doesn't have one, so
	// interactive output will override last line of static output
	return staticOutput.height > 0 ? `${staticOutput.get().output}\n` : '';
};

const renderer = (node: DOMElement, isScreenReaderEnabled: boolean): Result => {
	if (node.yogaNode) {
		if (isScreenReaderEnabled) {
			const output = renderNodeToScreenReaderOutput(node, {
				skipStaticElements: true,
			});

			const outputHeight = output === '' ? 0 : output.split('\n').length;

			return {
				output,
				outputHeight,
				staticOutput: renderStaticOutput(node, isScreenReaderEnabled),
			};
		}

		const output = new Output({
			width: node.yogaNode.getComputedWidth(),
			height: node.yogaNode.getComputedHeight(),
		});

		renderNodeToOutput(node, output, {
			skipStaticElements: true,
		});

		const staticOutput = renderStaticOutput(node, isScreenReaderEnabled);
		const {output: generatedOutput, height: outputHeight} = output.get();

		return {
			output: generatedOutput,
			outputHeight,
			staticOutput,
		};
	}

	return {
		output: '',
		outputHeight: 0,
		staticOutput: '',
	};
};

export default renderer;
