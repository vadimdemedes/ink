import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Static, Box, Text, render, useApp} from '../../src/index.js';

/*
Related to vadimdemedes/ink#973 (does not close it). This exercises the full-clear accounting bug found while investigating that report: the last line of a <Static> block taller than the viewport is erased (and never repainted) when the live region updates on a later frame. It does not cover the original incremental <Static> path from #973, which stays open.

Viewport rows come from argv[2]. The <Static> block has more items than the viewport. The live region first grows past the viewport then shrinks back, and that transition routes a frame through the full-clear path, which writes the live region without its trailing newline yet records its height as one row taller. The next *incremental* live-region update then erases one row too far, into the committed static content (the last line, "F").

Invariants this fixture relies on (keep them if you edit it):
  - The phases must render as distinct, ordered frames (inflate, shrink, nudge); if they coalesced into a single render the off-by-one would never be planted. Each phase yields a macrotask (setTimeout 0) so React's already-scheduled work commits before the next update, then awaits `waitUntilRenderFlush()` so the frame's bytes reach stdout before the next phase starts. The flush alone is not enough: without the macrotask hop all three updates batch into a single frame and the test passes without exercising the bug. The test's distinct-frame checks and its "LIVE-0" positive control guard against this; the control keys on the lowercase/uppercase `live`/`LIVE` distinction, so it must stay case-sensitive.
  - "F" must still be inside the bottom `rows` of the live frame when the erase happens (not yet scrolled into scrollback). If a future edit grows the static block or changes `rows` so "F" scrolls above the viewport first, the erase can no longer reach it and the test silently no-ops.
*/
function FullClearStaticAccounting() {
	const {exit, waitUntilRenderFlush} = useApp();
	const [liveLines, setLiveLines] = useState(1);
	const [label, setLabel] = useState('live');

	useEffect(() => {
		const nextMacrotask = async () =>
			new Promise<void>(resolve => {
				setTimeout(resolve, 0);
			});

		void (async () => {
			// Let the initial frame flush before starting the phases.
			await waitUntilRenderFlush();
			// Inflate live region past the viewport -> full-clear path.
			setLiveLines(5);
			await nextMacrotask();
			await waitUntilRenderFlush();
			// Shrink back below the viewport -> full-clear path leaves the cursor /
			// line-count accounting off by one.
			setLiveLines(1);
			await nextMacrotask();
			await waitUntilRenderFlush();
			// Small incremental live-region update (no overflow, no new static) ->
			// the erase that consumes the off-by-one row, wiping the last static
			// line.
			setLabel('LIVE');
			await nextMacrotask();
			await waitUntilRenderFlush();
			exit();
		})();
	}, [exit, waitUntilRenderFlush]);

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
render(<FullClearStaticAccounting />);
