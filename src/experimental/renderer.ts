import Yoga from 'yoga-layout-prebuilt';
import {renderNodeToOutput} from '../render-node-to-output';
import {calculateWrappedText} from '../calculate-wrapped-text';
import {Output} from './output';
import {setStyle} from './dom';
import {DOMElement, TEXT_NAME} from '../dom';

// Since <Static> components can be placed anywhere in the tree, this helper finds and returns them
const findStaticNode = (node: DOMElement): DOMElement | undefined => {
	if (node.unstable__static) {
		return node;
	}

	for (const childNode of node.childNodes) {
		if (childNode.nodeName !== TEXT_NAME) {
			if (childNode.unstable__static) {
				return childNode;
			}

			return findStaticNode(childNode);
		}
	}

	return undefined;
};

export const createRenderer = ({terminalWidth = 100}) => {
	return (node: DOMElement) => {
		setStyle(node, {
			width: terminalWidth
		});

		if (node.yogaNode) {
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

			if (staticNode?.yogaNode) {
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
				staticOutput: staticOutput ? `${staticOutput.get().output}\n` : ''
			};
		}

		return {
			output: '',
			outputHeight: 0,
			staticOutput: ''
		};
	};
};
