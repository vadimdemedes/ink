import React, {useState, useEffect, useRef, forwardRef} from 'react';
import {render, Box, Text, ResizeObserver, type DOMElement} from 'ink';

const Child = forwardRef<DOMElement>((_, ref) => {
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		const timer = setInterval(() => {
			setExpanded(prev => !prev);
		}, 500);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return (
		<Box
			ref={ref}
			flexDirection="column"
			borderStyle="single"
			borderColor="green"
		>
			<Text>I am the child component.</Text>
			{expanded && (
				<>
					<Text>Extra line 1</Text>
					<Text>Extra line 2</Text>
					<Text>Extra line 3</Text>
				</>
			)}
		</Box>
	);
});

function App() {
	const childRef = useRef<DOMElement>(null);
	const [dimensions, setDimensions] = useState<
		{width: number; height: number} | undefined
	>(undefined);

	useEffect(() => {
		if (!childRef.current) {
			return;
		}

		const observer = new ResizeObserver(entries => {
			const entry = entries[0];
			if (entry) {
				setDimensions(entry.contentRect);
			}
		});

		observer.observe(childRef.current);

		return () => {
			observer.disconnect();
		};
	}, []);

	return (
		<Box flexDirection="column" borderStyle="single" borderColor="blue">
			<Text>Parent</Text>
			{dimensions && (
				<Text>
					Child size: {dimensions.width}x{dimensions.height}
				</Text>
			)}
			<Child ref={childRef} />
		</Box>
	);
}

render(<App />);