import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Static, Box, Text, render, useApp} from '../../src/index.js';

// Reproduces vadimdemedes/ink#973: the last line of a <Static> block taller
// than the viewport is erased (and never repainted) when the live region
// updates on a later frame.
//
// Viewport rows come from argv[2]. The <Static> block has more items than the
// viewport. The live region first grows past the viewport then shrinks back —
// that transition routes a frame through the full-clear path, which writes the
// live region without its trailing newline yet records its height as one row
// taller. The next *incremental* live-region update then erases one row too far,
// into the committed static content (the last line, "F").
//
// Invariants this fixture relies on (keep them if you edit it):
//   - The phases must render as distinct, ordered frames (inflate -> shrink ->
//     nudge). They are driven by wall-clock timers; if they coalesce into a
//     single render the off-by-one is never planted. The test's "LIVE-0"
//     positive control guards against the frames not running at all.
//   - "F" must still be inside the bottom `rows` of the live frame when the
//     erase happens (not yet scrolled into scrollback). If a future edit grows
//     the static block or changes `rows` so "F" scrolls above the viewport
//     first, the erase can no longer reach it and the test silently no-ops.
function Issue973() {
	const {exit} = useApp();
	const [liveLines, setLiveLines] = useState(1);
	const [label, setLabel] = useState('live');

	useEffect(() => {
		// Inflate live region past the viewport -> full-clear path.
		const inflate = setTimeout(() => {
			setLiveLines(5);
		}, 50);
		// Shrink back below the viewport -> full-clear path leaves the cursor /
		// line-count accounting off by one.
		const shrink = setTimeout(() => {
			setLiveLines(1);
		}, 100);
		// Small incremental live-region update (no overflow, no new static) -> the
		// erase that consumes the off-by-one row, wiping the last static line.
		const nudge = setTimeout(() => {
			setLabel('LIVE');
		}, 150);
		const finish = setTimeout(() => {
			exit();
		}, 200);

		return () => {
			clearTimeout(inflate);
			clearTimeout(shrink);
			clearTimeout(nudge);
			clearTimeout(finish);
		};
	}, [exit]);

	return (
		<>
			<Static items={['A', 'B', 'C', 'D', 'E', 'F']}>
				{item => <Text key={item}>{item}</Text>}
			</Static>

			<Box flexDirection="column">
				{Array.from({length: liveLines}, (_, index) => (
					<Text key={index}>{`${label}-${index}`}</Text>
				))}
			</Box>
		</>
	);
}

process.stdout.rows = Number(process.argv[2]);
render(<Issue973 />);
