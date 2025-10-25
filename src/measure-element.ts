import Yoga from 'yoga-layout';
import {type DOMElement} from './dom.js';
import {getScrollLeft, getScrollTop} from './scroll.js';

type Output = {
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
const measureElement = (node: DOMElement): Output => ({
	width: node.yogaNode?.getComputedWidth() ?? 0,
	height: node.yogaNode?.getComputedHeight() ?? 0,
});

/**
 * Get an element's inner width.
 */
export const getInnerWidth = (node: DOMElement): number => {
	const {yogaNode} = node;

	if (!yogaNode) {
		return 0;
	}

	const width = yogaNode.getComputedWidth() ?? 0;
	const borderLeft = yogaNode.getComputedBorder(Yoga.EDGE_LEFT);
	const borderRight = yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);

	return width - borderLeft - borderRight;
};

/*
 * Get an element's inner height.
 */
export const getInnerHeight = (node: DOMElement): number => {
	const {yogaNode} = node;

	if (!yogaNode) {
		return 0;
	}

	const height = yogaNode.getComputedHeight() ?? 0;
	const borderTop = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
	const borderBottom = yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	return height - borderTop - borderBottom;
};

/**
 * Get an element's position and dimensions relative to the root.
 */
export const getBoundingBox = (
	node: DOMElement,
): {x: number; y: number; width: number; height: number} => {
	const {yogaNode} = node;

	if (!yogaNode) {
		return {x: 0, y: 0, width: 0, height: 0};
	}

	const width = yogaNode.getComputedWidth() ?? 0;
	const height = yogaNode.getComputedHeight() ?? 0;

	let x = yogaNode.getComputedLeft();
	let y = yogaNode.getComputedTop();

	let parent = node.parentNode;
	while (parent?.yogaNode) {
		x += parent.yogaNode.getComputedLeft();
		y += parent.yogaNode.getComputedTop();

		if (parent.nodeName === 'ink-box') {
			const overflow = parent.style.overflow ?? 'visible';
			const overflowX = parent.style.overflowX ?? overflow;
			const overflowY = parent.style.overflowY ?? overflow;

			if (overflowY === 'scroll') {
				y -= getScrollTop(parent);
			}

			if (overflowX === 'scroll') {
				x -= getScrollLeft(parent);
			}
		}

		parent = parent.parentNode;
	}

	return {x, y, width, height};
};

/**
 * The entire height of an elements content.
 */
export const getScrollHeight = (node: DOMElement): number => {
	const {yogaNode} = node;
	if (!yogaNode) {
		return 0;
	}

	const top = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
	let maxBottom = top;
	for (let i = 0; i < yogaNode.getChildCount(); i++) {
		const child = yogaNode.getChild(i);
		const childBottom =
			child.getComputedTop() +
			child.getComputedHeight() +
			child.getComputedMargin(Yoga.EDGE_BOTTOM);

		if (childBottom > maxBottom) {
			maxBottom = childBottom;
		}
	}

	// We add bottom padding to the scroll height because we act as if the
	// bottom padding is part of the scrollable child content so that you
	// can scroll all the way to the bottom and see the full bottom padding
	// amount of padding after the rendered content.
	return maxBottom - top + yogaNode.getComputedPadding(Yoga.EDGE_BOTTOM);
};

/**
 * The entire width of an elements content.
 */
export const getScrollWidth = (node: DOMElement): number => {
	const {yogaNode} = node;
	if (!yogaNode) {
		return 0;
	}

	const left = yogaNode.getComputedBorder(Yoga.EDGE_LEFT);

	let maxRight = yogaNode.getComputedPadding(Yoga.EDGE_LEFT);
	for (let i = 0; i < yogaNode.getChildCount(); i++) {
		const child = yogaNode.getChild(i);
		const childRight =
			child.getComputedLeft() +
			child.getComputedWidth() +
			child.getComputedMargin(Yoga.EDGE_RIGHT);

		if (childRight > maxRight) {
			maxRight = childRight;
		}
	}

	// We add right padding to the scroll height because we act as if the
	// right padding is part of the scrollable child content so that you
	// can scroll all the way to the right and see the full right padding
	// amount of padding after the rendered content.
	return maxRight - left + yogaNode.getComputedPadding(Yoga.EDGE_RIGHT);
};

export default measureElement;
