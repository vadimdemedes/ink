import React, {useState, useEffect, useRef, forwardRef} from 'react';
import {
	render,
	Box,
	Text,
	ResizeObserver,
	type ResizeObserverEntry,
	type DOMElement,
} from '../../src/index.js';

const Child = forwardRef<DOMElement>((_, reference) => {
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		const timer = setInterval(() => {
			setExpanded(previous => !previous);
		}, 500);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return (
		<Box
			ref={reference}
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
	const childReference = useRef<DOMElement>(null);
	const [dimensions, setDimensions] = useState<
		{width: number; height: number} | undefined
	>(undefined);

	useEffect(() => {
		if (!childReference.current) {
			return;
		}

		const observer: ResizeObserver = new ResizeObserver(
			(entries: ResizeObserverEntry[]) => {
				const entry = entries[0];
				if (entry) {
					setDimensions(entry.contentRect);
				}
			},
		);

		observer.observe(childReference.current);

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
			<Child ref={childReference} />
		</Box>
	);
}

render(<App />);
