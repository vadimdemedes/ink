import {EDGE_LEFT, EDGE_RIGHT, type YogaNode} from './yoga.js';

const getMaxWidth = (yogaNode: YogaNode) => {
	return (
		yogaNode.getComputedWidth() -
		yogaNode.getComputedPadding(EDGE_LEFT) -
		yogaNode.getComputedPadding(EDGE_RIGHT) -
		yogaNode.getComputedBorder(EDGE_LEFT) -
		yogaNode.getComputedBorder(EDGE_RIGHT)
	);
};

export default getMaxWidth;
