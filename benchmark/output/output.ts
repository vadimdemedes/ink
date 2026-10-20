import {performance} from 'node:perf_hooks';
import Output from '../../src/output.js';

// Run with: npm run benchmark -- benchmark/output/output.ts
// Compare the same script on the base and the PR, in separate processes.
const frames = 30;
const samples = 7;

for (const rows of [24, 200]) {
	const timings: number[] = [];
	let checksum = 0;
	for (let sample = 0; sample < samples; sample++) {
		const start = performance.now();
		for (let frame = 0; frame < frames; frame++) {
			const output = new Output({width: 80, height: 24});
			output.clip({x1: 0, x2: 80, y1: 0, y2: 24});
			for (let row = 0; row < rows; row++) {
				output.write(
					0,
					row - (rows - 24),
					`\u{1B}[31m${row}: ${'styled text '.repeat(6)}\u{1B}[39m`,
					{transformers: []},
				);
			}

			output.unclip();
			checksum += output.get().output.length;
		}

		timings.push((performance.now() - start) / frames);
	}

	timings.sort((a, b) => a - b);
	console.log(
		`${rows} rows, 80x24 viewport: ${timings[Math.floor(samples / 2)]!.toFixed(3)} ms/frame (median of ${samples} batches); checksum=${checksum}`,
	);
}
