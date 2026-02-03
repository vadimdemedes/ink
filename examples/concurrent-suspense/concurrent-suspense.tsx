import React, {Suspense, useState} from 'react';
import {render, Box, Text} from '../../src/index.js';

// Simulated async data fetching with cache
const cache = new Map<
	string,
	{status: string; data?: string; promise?: Promise<void>}
>();

function fetchData(key: string, delay: number): string {
	const cached = cache.get(key);

	if (cached?.status === 'resolved') {
		return cached.data!;
	}

	if (cached?.status === 'pending') {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw cached.promise;
	}

	// Start fetching
	const promise = new Promise<void>(resolve => {
		setTimeout(() => {
			cache.set(key, {
				status: 'resolved',
				data: `Data for "${key}" (fetched in ${delay}ms)`,
			});
			resolve();
		}, delay);
	});

	cache.set(key, {status: 'pending', promise});
	// eslint-disable-next-line @typescript-eslint/only-throw-error
	throw promise;
}

// Component that suspends while fetching
function DataItem({
	name,
	delay,
}: {
	readonly name: string;
	readonly delay: number;
}) {
	const data = fetchData(name, delay);
	return (
		<Box marginLeft={2}>
			<Text color="green">{data}</Text>
		</Box>
	);
}

// Loading fallback
function Loading({message}: {readonly message: string}) {
	return (
		<Box marginLeft={2}>
			<Text color="yellow">{message}</Text>
		</Box>
	);
}

// Main app demonstrating concurrent suspense
function App() {
	const [showMore, setShowMore] = useState(false);

	// Auto-trigger "show more" after 2 seconds
	React.useEffect(() => {
		const timer = setTimeout(() => {
			setShowMore(true);
		}, 2000);
		return () => {
			clearTimeout(timer);
		};
	}, []);

	return (
		<Box flexDirection="column">
			<Text bold underline>
				Concurrent Suspense Demo
			</Text>
			<Text dimColor>
				(With concurrent: true, Suspense re-renders automatically)
			</Text>
			<Box marginTop={1} />

			<Text>Fast data (200ms):</Text>
			<Suspense fallback={<Loading message="Loading fast data..." />}>
				<DataItem name="fast" delay={200} />
			</Suspense>

			<Box marginTop={1} />

			<Text>Medium data (800ms):</Text>
			<Suspense fallback={<Loading message="Loading medium data..." />}>
				<DataItem name="medium" delay={800} />
			</Suspense>

			<Box marginTop={1} />

			<Text>Slow data (1500ms):</Text>
			<Suspense fallback={<Loading message="Loading slow data..." />}>
				<DataItem name="slow" delay={1500} />
			</Suspense>

			{showMore && (
				<>
					<Box marginTop={1} />
					<Text>Dynamically added (500ms):</Text>
					<Suspense fallback={<Loading message="Loading dynamic data..." />}>
						<DataItem name="dynamic" delay={500} />
					</Suspense>
				</>
			)}
		</Box>
	);
}

// Render with concurrent mode enabled
render(<App />, {concurrent: true});
