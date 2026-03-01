import React, {useState, useMemo, useTransition} from 'react';
import {render, Box, Text, useInput} from '../../src/index.js';

// Generate a large list of items for demonstration
function generateItems(filter: string): string[] {
	const allItems: string[] = [];
	for (let i = 0; i < 200; i++) {
		allItems.push(
			`Item ${i + 1}: ${['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'][i % 5]}`,
		);
	}

	if (!filter) {
		return allItems.slice(0, 10);
	}

	// Simulate expensive filtering
	const start = Date.now();
	while (Date.now() - start < 100) {
		// Artificial delay to simulate expensive computation
	}

	return allItems
		.filter(item => item.toLowerCase().includes(filter.toLowerCase()))
		.slice(0, 10);
}

function SearchApp() {
	const [query, setQuery] = useState('');
	const [isPending, startTransition] = useTransition();

	// This is the "deferred" state that can lag behind
	const [deferredQuery, setDeferredQuery] = useState('');

	// Filtered items based on deferred query (expensive computation)
	const filteredItems = useMemo(
		() => generateItems(deferredQuery),
		[deferredQuery],
	);

	// Handle keyboard input
	useInput((input, key) => {
		if (key.backspace || key.delete) {
			setQuery(previousQuery => previousQuery.slice(0, -1));
			startTransition(() => {
				setDeferredQuery(previousQuery => previousQuery.slice(0, -1));
			});
		} else if (input && !key.ctrl && !key.meta) {
			setQuery(previousQuery => previousQuery + input);
			// Wrap the expensive update in a transition
			startTransition(() => {
				setDeferredQuery(previousQuery => previousQuery + input);
			});
		}
	});

	return (
		<Box flexDirection="column">
			<Text bold underline>
				useTransition Demo
			</Text>
			<Text dimColor>
				(Type to search - input stays responsive while list updates)
			</Text>
			<Box marginTop={1} />

			<Box>
				<Text>Search: </Text>
				<Text color="cyan">{query || '(type something)'}</Text>
				{isPending ? <Text color="yellow"> (updating...)</Text> : null}
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text bold>
					Results{' '}
					{deferredQuery ? `for "${deferredQuery}"` : '(showing first 10)'}:
				</Text>
				{filteredItems.length === 0 ? (
					<Text dimColor> No items found</Text>
				) : (
					filteredItems.map(item => (
						<Text key={item} dimColor={isPending}>
							{item}
						</Text>
					))
				)}
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Press Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
}

// Render with concurrent mode enabled (required for useTransition)
render(<SearchApp />, {concurrent: true});
