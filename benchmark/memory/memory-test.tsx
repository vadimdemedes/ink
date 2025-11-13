import process from 'node:process';
import React from 'react';
import {render, Box, Text} from '../../src/index.js';

function getMemoryUsage() {
	if (process?.memoryUsage) {
		const usage = process.memoryUsage();
		return {
			rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100, // MB
			heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
			heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100, // MB
			external: Math.round((usage.external / 1024 / 1024) * 100) / 100, // MB
		};
	}

	return undefined;
}

function MemoryBenchmark() {
	const [iterationCount, setIterationCount] = React.useState(0);
	const [isRunning, setIsRunning] = React.useState(false);
	const initialMemoryReference = React.useRef(getMemoryUsage());
	const memorySnapshotsReference = React.useRef<
		Array<
			| {
					rss: number;
					heapUsed: number;
					heapTotal: number;
					external: number;
			  }
			| undefined
		>
	>([]);

	React.useEffect(() => {
		if (!isRunning) {
			return;
		}

		const runBenchmark = async () => {
			const iterations = 100_000;
			console.log('Starting memory benchmark...');
			console.log('Initial memory:', initialMemoryReference.current);

			// Take baseline measurement
			memorySnapshotsReference.current.push(getMemoryUsage());

			// Run benchmark with periodic memory checks
			for (let index = 0; index < iterations; index++) {
				setIterationCount(index + 1);

				// Take memory snapshots every 10,000 iterations
				if (index % 10_000 === 0) {
					const memUsage = getMemoryUsage();
					memorySnapshotsReference.current.push(memUsage);
					console.log(`Iteration ${index}:`, memUsage);
				}
			}

			// Final memory measurement
			memorySnapshotsReference.current.push(getMemoryUsage());

			// Calculate and display results
			console.log('\n=== Memory Analysis Results ===');
			console.log('Total iterations:', iterations);
			console.log('Memory snapshots:');
			for (const [i, snapshot] of memorySnapshotsReference.current.entries()) {
				console.log(`  Step ${i}:`, snapshot);
			}

			// Calculate memory growth
			if (memorySnapshotsReference.current.length >= 2) {
				const initial = memorySnapshotsReference.current[0]!;
				const final = memorySnapshotsReference.current.at(-1)!;

				const heapGrowth = final.heapUsed - initial.heapUsed;
				const rssGrowth = final.rss - initial.rss;

				console.log('\n=== Memory Growth Analysis ===');
				console.log(`Heap growth: ${heapGrowth.toFixed(2)} MB`);
				console.log(`RSS growth: ${rssGrowth.toFixed(2)} MB`);
				console.log(
					`Heap growth per 1K iterations: ${(heapGrowth / (iterations / 1000)).toFixed(4)} MB`,
				);
			}

			console.log('\nBenchmark completed!');
			setIsRunning(false);
		};

		const timeoutId = setTimeout(runBenchmark, 1000);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [isRunning]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text underline bold color="red">
				Memory Benchmark
			</Text>

			<Box marginTop={1}>
				<Text>Current Iteration: {iterationCount}</Text>
			</Box>

			<Box marginTop={1} width={60}>
				<Text>
					This benchmark measures memory usage during repeated rendering
					operations. It helps identify memory leaks and the effectiveness of
					optimizations like output caching.
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text backgroundColor="white" color="black">
					Memory Usage:
				</Text>

				<Box flexDirection="column" paddingLeft={1}>
					<Text>
						- <Text color="green">Heap Used:</Text> {getMemoryUsage()?.heapUsed}{' '}
						MB
					</Text>
					<Text>
						- <Text color="blue">RSS:</Text> {getMemoryUsage()?.rss} MB
					</Text>
					<Text>
						- <Text color="yellow">Heap Total:</Text>{' '}
						{getMemoryUsage()?.heapTotal} MB
					</Text>
				</Box>
			</Box>

			<Box marginTop={1}>
				<Text color={isRunning ? 'yellow' : 'green'}>
					Status: {isRunning ? 'Running...' : 'Ready'}
				</Text>
			</Box>
		</Box>
	);
}

const {rerender} = render(<MemoryBenchmark />);

// Auto-start benchmark after 2 seconds
setTimeout(() => {
	rerender(<MemoryBenchmark />);
}, 2000);
