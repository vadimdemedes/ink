import Yoga from 'yoga-layout-prebuilt';

export const getMaxWidth = (yogaNode: Yoga.YogaNode) => {
	return yogaNode.getComputedWidth() - (yogaNode.getComputedPadding(Yoga.EDGE_LEFT) * 2);
};
