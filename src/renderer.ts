import renderNodeToOutput, {
	renderNodeToScreenReaderOutput,
	type RenderState,
} from './render-node-to-output.js';
import Output from './output.js';
import {type DOMElement} from './dom.js';
import {type CursorPosition} from './log-update.js';

type Result = {
	output: string;
	outputHeight: number;
	staticOutput: string;
	cursorRequested: boolean;
	cursorPosition: CursorPosition | undefined;
};

const renderer = (node: DOMElement, isScreenReaderEnabled: boolean): Result => {
	if (node.yogaNode) {
		if (isScreenReaderEnabled) {
			const output = renderNodeToScreenReaderOutput(node, {
				skipStaticElements: true,
			});

			const outputHeight = output === '' ? 0 : output.split('\n').length;

			let staticOutput = '';

			if (node.staticNode) {
				staticOutput = renderNodeToScreenReaderOutput(node.staticNode, {
					skipStaticElements: false,
				});
			}

			return {
				output,
				outputHeight,
				staticOutput: staticOutput ? `${staticOutput}\n` : '',
				cursorRequested: false,
				cursorPosition: undefined,
			};
		}

		const output = new Output({
			width: node.yogaNode.getComputedWidth(),
			height: node.yogaNode.getComputedHeight(),
		});
		const renderState: RenderState = {
			cursorRequested: false,
			cursorPosition: undefined,
		};

		renderNodeToOutput(node, output, {
			skipStaticElements: true,
			renderState,
		});

		let staticOutput;

		if (node.staticNode?.yogaNode) {
			staticOutput = new Output({
				width: node.staticNode.yogaNode.getComputedWidth(),
				height: node.staticNode.yogaNode.getComputedHeight(),
			});

			renderNodeToOutput(node.staticNode, staticOutput, {
				skipStaticElements: false,
			});
		}

		const {output: generatedOutput, height: outputHeight} = output.get();

		return {
			output: generatedOutput,
			outputHeight,
			// Newline at the end is needed, because static output doesn't have one, so
			// interactive output will override last line of static output
			staticOutput: staticOutput ? `${staticOutput.get().output}\n` : '',
			cursorRequested: renderState.cursorRequested,
			cursorPosition: renderState.cursorPosition,
		};
	}

	return {
		output: '',
		outputHeight: 0,
		staticOutput: '',
		cursorRequested: false,
		cursorPosition: undefined,
	};
};

export default renderer;
