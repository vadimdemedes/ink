import {
	type RefObject,
	useState,
	useEffect,
	useCallback,
	useMemo,
	useContext,
} from 'react';
import {type DOMElement, addLayoutListener} from '../dom.js';
import measureElement from '../measure-element.js';
import RootNodeContext from '../components/RootNodeContext.js';

// Yoga's `right`/`bottom` are omitted: always `0` for flow layout and unintuitive for absolute positioning.
/**
Metrics of a box element.

All positions are relative to the element's parent.
*/
export type BoxMetrics = {
	/**
	Element width.
	*/
	readonly width: number;

	/**
	Element height.
	*/
	readonly height: number;

	/**
	Distance from the left edge of the parent. These are layout coordinates and do not include any `contentOffsetX`/`contentOffsetY` applied by an ancestor, so hit-testing inside a scrolled container has to subtract those offsets too.
	*/
	readonly left: number;

	/**
	Distance from the top edge of the parent. These are layout coordinates and do not include any `contentOffsetX`/`contentOffsetY` applied by an ancestor, so hit-testing inside a scrolled container has to subtract those offsets too.
	*/
	readonly top: number;

	/**
	Element width excluding borders.
	*/
	readonly clientWidth: number;

	/**
	Element height excluding borders.
	*/
	readonly clientHeight: number;
};

export type UseBoxMetricsResult = BoxMetrics & {
	/**
	Whether the currently tracked element has been measured in the latest layout pass.
	*/
	readonly hasMeasured: boolean;
};

const emptyMetrics: BoxMetrics = {
	width: 0,
	height: 0,
	left: 0,
	top: 0,
	clientWidth: 0,
	clientHeight: 0,
};

/**
A React hook that returns the current layout metrics for a tracked box element.
It updates when layout changes (for example terminal resize, sibling/content changes, or position changes).

The hook returns zeros for all metrics until the first layout pass completes. It also returns zeros when the tracked ref is detached.

Use `hasMeasured` to detect when the currently tracked element has been measured.

@example
```tsx
import {useRef} from 'react';
import {Box, Text, useBoxMetrics} from 'ink';

const Example = () => {
	const ref = useRef(null);
	const {width, height, left, top, hasMeasured} = useBoxMetrics(ref);
	return (
		<Box ref={ref}>
			<Text>
				{hasMeasured ? `${width}x${height} at ${left},${top}` : 'Measuring...'}
			</Text>
		</Box>
	);
};
```
*/
const useBoxMetrics = (
	/* eslint-disable-next-line @typescript-eslint/no-restricted-types --
		Creating a ref object with an initial null, especially when the ref object
		will be passed to a DOM node's ref attribute, is common in React. */
	ref: RefObject<DOMElement | null>,
): UseBoxMetricsResult => {
	const rootNode = useContext(RootNodeContext);
	const [metrics, setMetrics] = useState(emptyMetrics);
	const [hasMeasured, setHasMeasured] = useState(false);

	const updateMetrics = useCallback(() => {
		const node = ref.current;
		const layout = node?.yogaNode?.getComputedLayout();

		// `measureElement()` also returns `x`/`y`, which aren't part of `BoxMetrics` and must not enter the change detection below.
		let nextMetrics: BoxMetrics = emptyMetrics;

		if (node && layout) {
			const {width, height, clientWidth, clientHeight} = measureElement(node);

			nextMetrics = {
				width,
				height,
				left: layout.left,
				top: layout.top,
				clientWidth,
				clientHeight,
			};
		}

		setMetrics(previousMetrics => {
			const hasChanged = (
				Object.keys(nextMetrics) as Array<keyof BoxMetrics>
			).some(key => previousMetrics[key] !== nextMetrics[key]);

			return hasChanged ? nextMetrics : previousMetrics;
		});

		setHasMeasured(Boolean(node));
	}, [ref]);

	// Runs after every render of this component.
	// This keeps metrics fresh when local state/props in this subtree change.
	useEffect(updateMetrics);

	// Subscribe to root layout commits so memoized components still receive
	// sibling-driven position/size updates, even when they skip re-rendering.
	useEffect(() => {
		if (!rootNode) {
			return;
		}

		return addLayoutListener(rootNode, () => {
			// React attaches refs after the layout notification, during the same commit.
			queueMicrotask(updateMetrics);
		});
	}, [rootNode, updateMetrics]);

	return useMemo(
		() => ({
			...metrics,
			hasMeasured,
		}),
		[metrics, hasMeasured],
	);
};

export default useBoxMetrics;
