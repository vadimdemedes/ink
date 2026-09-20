import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Static, Box, Text, render, useApp} from '../../src/index.js';

/*
Reproduction for vadimdemedes/ink#973: a <Static> item taller than the
viewport commits while a small live region is present, and a later live-only
update must not erase the committed static content.

Phases render as distinct frames (live region first, then the tall static
item commits in the same frame as the live region, then a live-only nudge).
*/
function StaticCommit() {
	const {exit, waitUntilRenderFlush} = useApp();
	const itemLines = Number(process.argv[2]);
	const [phase, setPhase] = useState<'mount' | 'live' | 'nudge'>('mount');

	useEffect(() => {
		void (async () => {
			const nextMacrotask = async () =>
				new Promise<void>(resolve => {
					setTimeout(resolve, 0);
				});

			await waitUntilRenderFlush();
			// Same frame: tall static item commits while the live region stays.
			setPhase('live');
			await nextMacrotask();
			await waitUntilRenderFlush();
			// Live-only update on the next frame: the frame where an erase that
			// is one row off would wipe the last committed static line.
			setPhase('nudge');
			await nextMacrotask();
			await waitUntilRenderFlush();
			exit();
		})();
	}, [exit, waitUntilRenderFlush]);

	const staticItem =
		phase === 'mount'
			? []
			: [
					Array.from(
						{length: itemLines},
						(_, index) => `line ${index + 1}`,
					).join('\n'),
				];

	return (
		<>
			<Static items={staticItem}>
				{item => <Text key={item}>{item}</Text>}
			</Static>

			<Box flexDirection="column">
				<Text>{phase === 'nudge' ? 'INPUT BOX' : 'input box'}</Text>
			</Box>
		</>
	);
}

process.stdout.rows = Number(process.argv[2]);
render(<StaticCommit />);
