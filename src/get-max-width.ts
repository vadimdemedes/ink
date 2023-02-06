import Yoga from 'yoga-layout-prebuilt';

const getMaxWidth = (yogaNode: Yoga.YogaNode) => {
	return (
		yogaNode.getComputedWidth() -
		yogaNode.getComputedPadding(Yoga.EDGE_LEFT) -
		yogaNode.getComputedPadding(Yoga.EDGE_RIGHT) -
		yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
	);
};

export default getMaxWidth;
