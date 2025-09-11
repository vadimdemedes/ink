import Yoga from 'yoga-layout';
import {getScrollHeight, getScrollWidth, type DOMElement} from './dom.js';

type Output = {
	/**
	Element width.
	*/
	width: number;

	/**
	Element height.
	*/
	height: number;

	/**
	 * Element width without padding and borders.
	 */
	innerWidth: number;

	/**
	 * Element height without padding and borders.
	 */
	innerHeight: number;

	/**
	 * The entire height of an elements content.
	 */
	scrollHeight: number;

	/**
	 * The entire width of an elements content.
	 */
	scrollWidth: number;
};

/**
Measure the dimensions of a particular `<Box>` element.
 */
const measureElement = (node: DOMElement): Output => {
	const {yogaNode} = node;

	if (!yogaNode) {
		return {
			width: 0,
			height: 0,
			innerWidth: 0,
			innerHeight: 0,
			scrollHeight: 0,
			scrollWidth: 0,
		};
	}

	const width = yogaNode.getComputedWidth() ?? 0;
	const height = yogaNode.getComputedHeight() ?? 0;

	const borderLeft = yogaNode.getComputedBorder(Yoga.EDGE_LEFT);
	const borderRight = yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);
	const borderTop = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
	const borderBottom = yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	return {
		width,
		height,
		innerWidth: width - borderLeft - borderRight,
		innerHeight: height - borderTop - borderBottom,
		scrollHeight: getScrollHeight(yogaNode),
		scrollWidth: getScrollWidth(yogaNode),
	};
};

export default measureElement;
