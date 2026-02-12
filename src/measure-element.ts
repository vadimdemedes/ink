import {type DOMElement} from './dom.js';
import {getAbsolutePosition} from './layout.js';

type Output = {
	/**
	Element X position relative to Ink output origin.
	*/
	x: number;

	/**
	Element Y position relative to Ink output origin.
	*/
	y: number;

	/**
	Element width.
	*/
	width: number;

	/**
	Element height.
	*/
	height: number;
};

/**
Measure the dimensions of a particular `<Box>` element.
*/
const measureElement = (node: DOMElement): Output => {
	const position = getAbsolutePosition(node);

	return {
		x: position?.x ?? 0,
		y: position?.y ?? 0,
		width: node.yogaNode?.getComputedWidth() ?? 0,
		height: node.yogaNode?.getComputedHeight() ?? 0,
	};
};

export default measureElement;
