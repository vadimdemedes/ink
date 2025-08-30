import React, {useState, useEffect} from 'react';
import {render, Box, Text} from '../../src/index.js';

function App() {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setCount(c => c + 1);
		}, 10); // Update every 10ms

		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<Box flexDirection="column" padding={1}>
			<Text>Counter: {count}</Text>
			<Text>This updates every 10ms but renders are throttled</Text>
			<Text>Press Ctrl+C to exit</Text>
		</Box>
	);
}

// Example with custom maxFps
render(<App />, {
	maxFps: 10, // Only render at 10fps (every ~100ms) instead of default 30fps
});
