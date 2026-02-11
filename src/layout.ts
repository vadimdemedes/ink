import Yoga from 'yoga-layout';
import {type DOMElement} from './dom.js';

export type Position = {
	x: number;
	y: number;
};

const getAbsoluteBorderPosition = (node: DOMElement): Position | undefined => {
	let currentNode: DOMElement | undefined = node;
	let x = 0;
	let y = 0;

	while (currentNode?.parentNode) {
		if (!currentNode.yogaNode) {
			return undefined;
		}

		x += currentNode.yogaNode.getComputedLeft();
		y += currentNode.yogaNode.getComputedTop();
		currentNode = currentNode.parentNode;
	}

	return {x, y};
};

export const getAbsolutePosition = (node: DOMElement): Position | undefined => {
	return getAbsoluteBorderPosition(node);
};

export const getAbsoluteContentPosition = (
	node: DOMElement,
): Position | undefined => {
	const borderPosition = getAbsoluteBorderPosition(node);
	if (!borderPosition || !node.yogaNode) {
		return undefined;
	}

	return {
		x:
			borderPosition.x +
			node.yogaNode.getComputedBorder(Yoga.EDGE_LEFT) +
			node.yogaNode.getComputedPadding(Yoga.EDGE_LEFT),
		y:
			borderPosition.y +
			node.yogaNode.getComputedBorder(Yoga.EDGE_TOP) +
			node.yogaNode.getComputedPadding(Yoga.EDGE_TOP),
	};
};
