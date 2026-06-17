import React, {useRef} from 'react';
import {
	render,
	Text,
	Box,
	useBoxMetrics,
	type DOMElement,
} from '../../src/index.js';

// This reproduces a CLI freeze/crash caused by layout listener recursion.
//
// `useBoxMetrics` subscribes to layout commits. When the rendered size depends
// on the measured size, every commit re-measures, schedules new state, and
// commits again. Without deferring the listener callbacks out of React's
// commit stack, this feedback loop runs synchronously *inside* the commit and
// recurses until React trips its nested-update guard ("Maximum update depth
// exceeded"), freezing/crashing the CLI.
//
// With the fix, the listener runs in a microtask after the commit finishes, so
// each step is a normal update and the box converges at the cap below.
const maxLines = 60;

function GrowingBox() {
	const ref = useRef<DOMElement>(null);
	const {height} = useBoxMetrics(ref);

	// Render one more line than we last measured: the layout grows, which
	// re-measures, which renders another line, and so on until the cap.
	const lineCount = Math.min(height + 1, maxLines);

	return (
		<Box flexDirection="column">
			<Text color="cyan">
				Measured height: {height} (growing to {maxLines})
			</Text>
			<Box ref={ref} flexDirection="column">
				{Array.from({length: lineCount}, (_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<Text key={index}>line {index + 1}</Text>
				))}
			</Box>
		</Box>
	);
}

render(<GrowingBox />);
