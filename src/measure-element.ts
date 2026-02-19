import {type DOMElement} from './dom.js';

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
Returns an object with `width` and `height` properties.
This function is useful when your component needs to know the amount of available space it has. You can use it when you need to change the layout based on the length of its content.

Note: `measureElement()` returns `{width: 0, height: 0}` when called during render (before layout is calculated). Call it from post-render code, such as `useEffect`, `useLayoutEffect`, input handlers, or timer callbacks. When content changes, pass the relevant dependency to your effect so it re-measures after each update.
*/
const measureElement = (node: DOMElement): Output => ({
	width: node.yogaNode?.getComputedWidth() ?? 0,
	height: node.yogaNode?.getComputedHeight() ?? 0,
});

export default measureElement;
