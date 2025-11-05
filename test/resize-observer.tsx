import React, {useRef, useEffect, useState} from 'react';
import test from 'ava';
import delay from 'delay';
import {
	render,
	Box,
	Text,
	ResizeObserver,
	type DOMElement,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('ResizeObserver detects size changes', async t => {
	function Child() {
		const ref = useRef<DOMElement>(null);
		const [dimensions, setDimensions] = useState<
			{width: number; height: number} | undefined
		>(undefined);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const observer = new ResizeObserver(entries => {
				const entry = entries[0];
				if (entry) {
					setDimensions(entry.contentRect);
				}
			});

			observer.observe(ref.current);

			return () => {
				observer.disconnect();
			};
		}, []);

		return (
			<Box ref={ref} width="100%" height="100%">
				{dimensions && (
					<Text>
						{dimensions.width}x{dimensions.height}
					</Text>
				)}
			</Box>
		);
	}

	function App({
		width,
		height,
	}: {
		readonly width: number;
		readonly height: number;
	}) {
		return (
			<Box width={width} height={height}>
				<Child />
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<App width={10} height={5} />, {stdout});
	await delay(100);
	t.is(stdout.get(), '10x5');

	rerender(<App width={20} height={10} />);
	await delay(100);
	t.is(stdout.get(), '20x10');

	unmount();
});

test('ResizeObserver handles multiple observers', async t => {
	function Child() {
		const ref = useRef<DOMElement>(null);
		const [count, setCount] = useState(0);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const observer1 = new ResizeObserver(() => {
				setCount(c => c + 1);
			});

			const observer2 = new ResizeObserver(() => {
				setCount(c => c + 1);
			});

			observer1.observe(ref.current);
			observer2.observe(ref.current);

			return () => {
				observer1.disconnect();
				observer2.disconnect();
			};
		}, []);

		return (
			<Box ref={ref} width={10} height={5}>
				<Text>{count}</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(
		<Box>
			<Child />
		</Box>,
		{stdout},
	);
	await delay(100);
	// Initial render triggers both observers once
	t.is(stdout.get(), '2');

	// Rerender with same size shouldn't trigger observers
	rerender(
		<Box>
			<Child />
		</Box>,
	);
	await delay(100);
	t.is(stdout.get(), '2');

	unmount();
});

test('ResizeObserver unobserve works', async t => {
	function Child() {
		const ref = useRef<DOMElement>(null);
		const [count, setCount] = useState(0);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const observer = new ResizeObserver(() => {
				setCount(c => c + 1);
			});

			observer.observe(ref.current);

			// Unobserve immediately to test it
			setTimeout(() => {
				observer.unobserve(ref.current!);
			}, 0);

			return () => {
				observer.disconnect();
			};
		}, []);

		return (
			<Box ref={ref} width={10} height={5}>
				<Text>{count}</Text>
			</Box>
		);
	}

	function App({width}: {readonly width: number}) {
		return (
			<Box width={width}>
				<Child />
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<App width={10} />, {stdout});
	await delay(100);
	t.is(stdout.get(), '1');

	// Change width, but observer should be unobserved by now
	// We need to wait for the timeout in useEffect
	await new Promise(resolve => {
		setTimeout(resolve, 10);
	});
	rerender(<App width={20} />);
	await delay(100);
	t.is(stdout.get(), '1');

	unmount();
});
