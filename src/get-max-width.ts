import {type YogaNode, EDGE_LEFT, EDGE_RIGHT} from './yoga-init.js';

const getMaxWidth = (yogaNode: YogaNode) => {
	return (
		yogaNode.getComputedWidth() -
		yogaNode.getComputedPadding(EDGE_LEFT()) -
		yogaNode.getComputedPadding(EDGE_RIGHT()) -
		yogaNode.getComputedBorder(EDGE_LEFT()) -
		yogaNode.getComputedBorder(EDGE_RIGHT())
	);
};

export default getMaxWidth;
