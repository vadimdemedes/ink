import {type DOMElement} from './dom.js';

type Output = {
	/**
	Horizontal position (0-based column) in the rendered frame.
	*/
	x: number;

	/**
	Vertical position (0-based row) in the rendered frame, including any `<Static>` output above the live region.
	*/
	y: number;

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
Measure the layout metrics of a particular `<Box>` element.
Returns an object with `x`, `y`, `width`, and `height` properties.

`x` and `y` are computed by walking up the layout tree and accumulating each ancestor's offset — useful for mouse hit-testing when combined with terminal mouse input.

Note: `measureElement()` returns `{x: 0, y: 0, width: 0, height: 0}` when called during render (before layout is calculated). Call it from post-render code, such as `useEffect`, `useLayoutEffect`, input handlers, or timer callbacks. When content changes, pass the relevant dependency to your effect so it re-measures after each update.
*/
const measureElement = (node: DOMElement): Output => {
	const {yogaNode} = node;

	if (!yogaNode) {
		return {x: 0, y: 0, width: 0, height: 0};
	}

	let x = yogaNode.getComputedLeft();
	let y = yogaNode.getComputedTop();

	let current = node.parentNode;
	let root: DOMElement | undefined;

	while (current) {
		if (current.yogaNode) {
			x += current.yogaNode.getComputedLeft();
			y += current.yogaNode.getComputedTop();
		}

		if (!current.parentNode) {
			root = current;
		}

		current = current.parentNode;
	}

	y += root?.internal_staticOutputHeight ?? 0;

	return {
		x,
		y,
		width: yogaNode.getComputedWidth(),
		height: yogaNode.getComputedHeight(),
	};
};

export default measureElement;
export type {Output as ElementMetrics};
