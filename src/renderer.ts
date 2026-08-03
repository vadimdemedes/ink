import renderNodeToOutput, {
	renderNodeToScreenReaderOutput,
	type FlowState,
} from './render-node-to-output.js';
import Output from './output.js';
import {type DOMElement} from './dom.js';
import {
	type FrameBoundary,
	type FrameCell,
	type ScreenSelection,
} from './frame-controller.js';

type Result = {
	output: string;
	outputHeight: number;
	staticOutput: string;
	cells?: FrameCell[][];
	boundaries?: Array<Array<FrameBoundary | undefined>>;
};

type Options = {
	/**
	Selection region to highlight before serialization.
	*/
	selection?: ScreenSelection;

	/**
	Whether to expose the composited cells in the result. Only enabled when a
	frame consumer subscribed to the frame controller.
	*/
	captureCells?: boolean;
};

const renderer = (
	node: DOMElement,
	isScreenReaderEnabled: boolean,
	options: Options = {},
): Result => {
	const {selection, captureCells} = options;

	if (node.yogaNode) {
		// Selection metadata (per-cell `selectable`, flows, boundaries) is
		// resolved whenever it can be observed: when cells are captured or a
		// selection highlight is applied.
		const flows: FlowState | undefined =
			captureCells === true || selection !== undefined
				? {ids: new Map<unknown, number>(), next: 1}
				: undefined;

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
			};
		}

		const output = new Output({
			width: node.yogaNode.getComputedWidth(),
			height: node.yogaNode.getComputedHeight(),
		});

		renderNodeToOutput(node, output, {
			skipStaticElements: true,
			flows,
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

		const {
			output: generatedOutput,
			height: outputHeight,
			cells,
			boundaries,
		} = output.get(selection, captureCells);

		return {
			output: generatedOutput,
			outputHeight,
			// Newline at the end is needed, because static output doesn't have one, so
			// interactive output will override last line of static output
			staticOutput: staticOutput ? `${staticOutput.get().output}\n` : '',
			cells,
			boundaries,
		};
	}

	return {
		output: '',
		outputHeight: 0,
		staticOutput: '',
	};
};

export default renderer;
