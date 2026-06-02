import {type DOMElement} from './dom.js';

type BoundingBox = {
	/**
	Horizontal position relative to the terminal's left edge (0-based column).
	*/
	x: number;

	/**
	Vertical position relative to the terminal's top edge (0-based row).
	*/
	y: number;

	/**
	Element width in columns.
	*/
	width: number;

	/**
	Element height in rows.
	*/
	height: number;
};

/**
Get the absolute bounding box of an element on screen.

Unlike `measureElement()` which returns only width and height, `getBoundingBox()` returns the element's absolute position (x, y) by walking up the layout tree and accumulating each ancestor's computed offset. This is essential for mouse hit-testing — determining which element a click or scroll event targets.

Note: Like `measureElement()`, this returns `{x: 0, y: 0, width: 0, height: 0}` when called before layout is calculated. Call it from post-render code such as `useEffect`, `useLayoutEffect`, input handlers, or timer callbacks.

@example
```tsx
import {useRef, useEffect} from 'react';
import {Box, Text, getBoundingBox} from 'ink';

const Example = () => {
	const ref = useRef(null);

	useEffect(() => {
		if (ref.current) {
			const box = getBoundingBox(ref.current);
			// box.x, box.y = absolute screen position
			// box.width, box.height = element dimensions
		}
	});

	return (
		<Box ref={ref}>
			<Text>Hello</Text>
		</Box>
	);
};
```
*/
const getBoundingBox = (node: DOMElement): BoundingBox | undefined => {
	const {yogaNode} = node;

	if (!yogaNode) {
		return undefined;
	}

	let x = yogaNode.getComputedLeft();
	let y = yogaNode.getComputedTop();

	let current = node.parentNode;

	while (current) {
		if (current.yogaNode) {
			x += current.yogaNode.getComputedLeft();
			y += current.yogaNode.getComputedTop();
		}

		current = current.parentNode;
	}

	return {
		x,
		y,
		width: yogaNode.getComputedWidth(),
		height: yogaNode.getComputedHeight(),
	};
};

export default getBoundingBox;
export type {BoundingBox};
