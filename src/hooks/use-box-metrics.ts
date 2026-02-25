import {type RefObject, useState, useEffect, useCallback, useMemo} from 'react';
import {type DOMElement, addLayoutListener} from '../dom.js';
import useStdout from './use-stdout.js';

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
	Distance from the left edge of the parent.
	*/
	readonly left: number;

	/**
	Distance from the top edge of the parent.
	*/
	readonly top: number;
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
};

const findRootNode = (node?: DOMElement): DOMElement | undefined => {
	if (!node) {
		return undefined;
	}

	if (!node.parentNode) {
		return node.nodeName === 'ink-root' ? node : undefined;
	}

	return findRootNode(node.parentNode);
};

/**
A React hook that returns the current layout metrics for a tracked box element.
It updates when layout changes (for example terminal resize, sibling/content changes, or position changes).

The hook returns `{width: 0, height: 0, left: 0, top: 0}` until the first layout pass completes. It also returns zeros when the tracked ref is detached.

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
const useBoxMetrics = (ref: RefObject<DOMElement>): UseBoxMetricsResult => {
	const [metrics, setMetrics] = useState<BoxMetrics>(emptyMetrics);
	const [hasMeasured, setHasMeasured] = useState(false);
	const {stdout} = useStdout();

	const updateMetrics = useCallback(() => {
		const layout = ref.current?.yogaNode?.getComputedLayout() ?? emptyMetrics;

		setMetrics(previousMetrics => {
			const hasChanged =
				previousMetrics.width !== layout.width ||
				previousMetrics.height !== layout.height ||
				previousMetrics.left !== layout.left ||
				previousMetrics.top !== layout.top;

			return hasChanged ? layout : previousMetrics;
		});

		setHasMeasured(Boolean(ref.current));
	}, [ref]);

	// Runs after every render of this component.
	// This keeps metrics fresh when local state/props in this subtree change.
	useEffect(updateMetrics);

	// Subscribe to root layout commits so memoized components still receive
	// sibling-driven position/size updates, even when they skip re-rendering.
	useEffect(() => {
		const rootNode = findRootNode(ref.current);

		if (!rootNode) {
			return;
		}

		return addLayoutListener(rootNode, updateMetrics);
	});

	// Terminal resize events do not go through React's render cycle. Ink
	// recalculates Yoga layout in its own resize handler — registered in the
	// Ink constructor, before this hook mounts — so by the time the resize
	// callback runs, Yoga has already computed the post-resize metrics.
	useEffect(() => {
		stdout.on('resize', updateMetrics);

		return () => {
			stdout.off('resize', updateMetrics);
		};
	}, [stdout, updateMetrics]);

	return useMemo(
		() => ({
			...metrics,
			hasMeasured,
		}),
		[metrics, hasMeasured],
	);
};

export default useBoxMetrics;
