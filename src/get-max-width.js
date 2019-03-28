export default yogaNode => {
	return yogaNode.getComputedWidth() - (yogaNode.getComputedPadding() * 2);
};
