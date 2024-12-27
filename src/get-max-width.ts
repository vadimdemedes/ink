import * as Yoga from 'yoga-wasm-web';
import {type Node as YogaNode} from 'yoga-wasm-web';

const getMaxWidth = (yogaNode: YogaNode): number => {
	return (
		yogaNode.getComputedWidth() -
		yogaNode.getComputedPadding(Yoga.EDGE_LEFT) -
		yogaNode.getComputedPadding(Yoga.EDGE_RIGHT) -
		yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
	);
};

export default getMaxWidth;
