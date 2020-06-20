import type {DOMElement} from './dom';

interface Output {
	/**
	 * Element width
	 */
	width: number;

	/**
	 * Element height
	 */
	height: number;
}

/**
 * Measure dimensions of a particular `<Box>` element.
 */
export default (node: DOMElement): Output => ({
	width: node.yogaNode?.getComputedWidth() ?? 0,
	height: node.yogaNode?.getComputedHeight() ?? 0
});
