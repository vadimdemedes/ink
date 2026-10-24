import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import process from 'node:process';
import {setImmediate, setTimeout} from 'node:timers/promises';
import {setFlagsFromString} from 'node:v8';
import {runInNewContext} from 'node:vm';
import React from 'react';
import {Box, Text, renderToString} from '../../src/index.js';

// Run with: npm run benchmark -- benchmark/layout/layout.tsx
// Compare the same script on the base and the PR, in separate processes.
// Each scenario runs in its own process so caches filled by one don't affect the next.

setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;

const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do';
const row = (index: number, suffix = '') =>
	`\u{1B}[3${index % 7}mRow ${index}: ${words} ${words}${suffix}\u{1B}[39m`;

// Garbage that is only weakly reachable is released after the event loop turns, so
// let it run before collecting. A synchronous loop would report it as retained.
const settledHeap = async () => {
	for (let attempt = 0; attempt < 3; attempt++) {
		// eslint-disable-next-line no-await-in-loop
		await setTimeout(10);
		gc();
	}

	return process.memoryUsage().heapUsed;
};

const retainedMegabytes = async (baseline: number) =>
	(((await settledHeap()) - baseline) / 1024 / 1024).toFixed(1);

type Scenario = {
	description: string;
	frames: number;
	checkpoints: number[];
	render: (frame: number) => React.JSX.Element;
};

// One wrapped multiline Text whose last row changes every frame, so every frame
// is a new full-screen key for measureText and wrapText.
const dashboardRows = Array.from({length: 39}, (_, index) => row(index));
const dashboard: Scenario = {
	description: 'one 40-row Text, last row changes each frame',
	frames: 12_000,
	checkpoints: [1000, 4000, 8000, 12_000],
	render: frame => (
		<Box width={80}>
			<Text>{[...dashboardRows, row(39, ` ${frame}`)].join('\n')}</Text>
		</Box>
	),
};

// Many wrapped Text nodes where one changes per frame, so nearly every
// measurement is a cache hit.
const list: Scenario = {
	description: '200 Text rows, one changes each frame',
	frames: 1000,
	checkpoints: [1000],
	render: frame => (
		<Box flexDirection="column" width={60}>
			{Array.from({length: 200}, (_, index) => (
				<Text key={index}>
					{row(index, index === frame % 200 ? ` ${frame}` : '')}
				</Text>
			))}
		</Box>
	),
};

const scenarios: Record<string, Scenario> = {dashboard, list};

const run = async (name: string, scenario: Scenario) => {
	// Warm up React and the JIT on content that won't recur.
	for (let frame = 0; frame < 50; frame++) {
		renderToString(scenario.render(-1 - frame));
	}

	const baseline = await settledHeap();
	const timings: number[] = [];
	const memory: string[] = [];
	let checksum = 0;

	for (let frame = 0; frame < scenario.frames; frame++) {
		const start = performance.now();
		checksum += renderToString(scenario.render(frame)).length;
		timings.push(performance.now() - start);

		// Real apps render in response to events, so yield between frames.
		// eslint-disable-next-line no-await-in-loop
		await setImmediate();

		if (scenario.checkpoints.includes(frame + 1)) {
			// eslint-disable-next-line no-await-in-loop
			memory.push(`${frame + 1}: ${await retainedMegabytes(baseline)} MB`);
		}
	}

	timings.sort((a, b) => a - b);
	const median = timings[Math.floor(timings.length / 2)]!;
	const p95 = timings[Math.floor(timings.length * 0.95)]!;
	console.log(
		`${name} (${scenario.description}): ${median.toFixed(3)} ms/frame median, ${p95.toFixed(3)} ms p95; checksum=${checksum}`,
	);
	console.log(`  retained heap after frames: ${memory.join(', ')}`);
};

const [selected] = process.argv.slice(2);
if (selected === undefined) {
	for (const name of Object.keys(scenarios)) {
		execFileSync(
			process.execPath,
			[...process.execArgv, process.argv[1]!, name],
			{stdio: 'inherit'},
		);
	}
} else {
	await run(selected, scenarios[selected]!);
}
