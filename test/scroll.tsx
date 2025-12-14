import React, {useRef, useEffect, useState} from 'react';
import test from 'ava';
import boxen from 'boxen';
import delay from 'delay';
import {Box, Text, render, type BoxRef} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

const box = (text: string): string => {
	return boxen(text, {borderStyle: 'round'});
};

test('overflow scroll - clips content like overflow hidden', t => {
	const output = renderToString(
		<Box width={6} overflowX="scroll">
			<Box width={16} flexShrink={0}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'Hello');
});

test('overflow scroll - clips content vertically', t => {
	const output = renderToString(
		<Box height={2} overflowY="scroll" flexDirection="column">
			<Box flexShrink={0}>
				<Text>Line #1</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #2</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #3</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'Line #1\nLine #2');
});

test('overflow scroll - clips content with border', t => {
	const output = renderToString(
		<Box width={8} overflow="scroll" borderStyle="round">
			<Box width={16} flexShrink={0}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('Hello '));
});

test('BoxRef - scrollTo updates scroll position', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);
		const [scrollY, setScrollY] = useState(0);

		useEffect(() => {
			setScrollY(2);
		}, []);

		useEffect(() => {
			if (boxReference.current && scrollY > 0) {
				boxReference.current.scrollTo({x: 0, y: scrollY});
			}
		}, [scrollY]);

		return (
			<Box
				ref={boxReference}
				width={10}
				height={3}
				overflow="scroll"
				flexDirection="column"
			>
				<Box flexShrink={0}>
					<Text>Line 1</Text>
				</Box>
				<Box flexShrink={0}>
					<Text>Line 2</Text>
				</Box>
				<Box flexShrink={0}>
					<Text>Line 3</Text>
				</Box>
				<Box flexShrink={0}>
					<Text>Line 4</Text>
				</Box>
				<Box flexShrink={0}>
					<Text>Line 5</Text>
				</Box>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	await delay(100);

	const output = stdout.get();
	t.true(output.includes('Line 3'));
	t.true(output.includes('Line 4'));
	t.true(output.includes('Line 5'));
	t.false(output.includes('Line 1'));
	t.false(output.includes('Line 2'));
});

test('BoxRef - getScrollPosition returns current position', t => {
	const stdout = createStdout(100);
	let capturedPosition: {x: number; y: number} | undefined;

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);

		useEffect(() => {
			if (boxReference.current) {
				boxReference.current.scrollTo({x: 5, y: 10});
				capturedPosition = boxReference.current.getScrollPosition();
			}
		}, []);

		return (
			<Box ref={boxReference} width={20} height={10} overflow="scroll">
				<Text>Content</Text>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	t.deepEqual(capturedPosition, {x: 5, y: 10});
});

test('BoxRef - ref is a DOMElement with scroll methods', t => {
	const stdout = createStdout(100);
	let hasYogaNode = false;
	let hasScrollTo = false;

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);

		useEffect(() => {
			if (boxReference.current) {
				hasYogaNode = boxReference.current.yogaNode !== undefined;
				hasScrollTo = typeof boxReference.current.scrollTo === 'function';
			}
		}, []);

		return (
			<Box ref={boxReference} width={20} height={10} overflow="scroll">
				<Text>Content</Text>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	t.true(hasYogaNode);
	t.true(hasScrollTo);
});

test('overflow scroll - horizontal scroll shifts content', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);
		const [scrollX, setScrollX] = useState(0);

		useEffect(() => {
			setScrollX(6);
		}, []);

		useEffect(() => {
			if (boxReference.current && scrollX > 0) {
				boxReference.current.scrollTo({x: scrollX, y: 0});
			}
		}, [scrollX]);

		return (
			<Box ref={boxReference} width={5} height={1} overflowX="scroll">
				<Box width={16} flexShrink={0}>
					<Text>Hello World</Text>
				</Box>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	await delay(100);

	const output = stdout.get();
	t.is(output.trim(), 'World');
});

test('overflow scroll - vertical scroll with borders', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);
		const [scrollY, setScrollY] = useState(0);

		useEffect(() => {
			setScrollY(2);
		}, []);

		useEffect(() => {
			if (boxReference.current && scrollY > 0) {
				boxReference.current.scrollTo({x: 0, y: scrollY});
			}
		}, [scrollY]);

		return (
			<Box
				ref={boxReference}
				width={10}
				height={5}
				overflow="scroll"
				borderStyle="round"
				flexDirection="column"
			>
				{Array.from({length: 10}, (_, i) => (
					<Box key={i} flexShrink={0}>
						<Text>Item {i}</Text>
					</Box>
				))}
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	await delay(100);

	const output = stdout.get();

	t.true(output.includes('╭'));
	t.true(output.includes('╰'));
	t.false(output.includes('Item 0'));
	t.false(output.includes('Item 1'));
	t.true(output.includes('Item 2'));
	t.true(output.includes('Item 3'));
	t.true(output.includes('Item 4'));
});

test('overflow scroll - scroll does not affect elements outside container', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);
		const [scrollY, setScrollY] = useState(0);

		useEffect(() => {
			setScrollY(5);
		}, []);

		useEffect(() => {
			if (boxReference.current && scrollY > 0) {
				boxReference.current.scrollTo({x: 0, y: scrollY});
			}
		}, [scrollY]);

		return (
			<Box flexDirection="column">
				<Text>Header</Text>
				<Box
					ref={boxReference}
					width={10}
					height={3}
					overflow="scroll"
					flexDirection="column"
				>
					{Array.from({length: 10}, (_, i) => (
						<Box key={i} flexShrink={0}>
							<Text>Item {i}</Text>
						</Box>
					))}
				</Box>
				<Text>Footer</Text>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	await delay(100);

	const output = stdout.get();

	t.true(output.includes('Header'));
	t.true(output.includes('Footer'));
	t.true(output.includes('Item 5'));
	t.true(output.includes('Item 6'));
	t.true(output.includes('Item 7'));
});

test('BoxRef - partial scrollTo updates only specified axis', t => {
	const stdout = createStdout(100);
	let capturedPosition: {x: number; y: number} | undefined;

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);

		useEffect(() => {
			if (boxReference.current) {
				boxReference.current.scrollTo({x: 5, y: 10});
				boxReference.current.scrollTo({y: 20});
				capturedPosition = boxReference.current.getScrollPosition();
			}
		}, []);

		return (
			<Box ref={boxReference} width={20} height={10} overflow="scroll">
				<Text>Content</Text>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	t.deepEqual(capturedPosition, {x: 5, y: 20});
});

test('BoxRef - scrollToTop scrolls to y=0', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);
		const [step, setStep] = useState(0);

		useEffect(() => {
			if (boxReference.current && step === 0) {
				boxReference.current.scrollTo({y: 5});
				setStep(1);
			}
		}, [step]);

		useEffect(() => {
			if (boxReference.current && step === 1) {
				boxReference.current.scrollToTop();
				setStep(2);
			}
		}, [step]);

		return (
			<Box
				ref={boxReference}
				width={10}
				height={3}
				overflow="scroll"
				flexDirection="column"
			>
				{Array.from({length: 10}, (_, i) => (
					<Box key={i} flexShrink={0}>
						<Text>Line {i}</Text>
					</Box>
				))}
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	await delay(100);

	const output = stdout.get();
	t.true(output.includes('Line 0'));
	t.true(output.includes('Line 1'));
	t.true(output.includes('Line 2'));
});

test('BoxRef - scrollToBottom scrolls to max y', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxReference = useRef<BoxRef>(null);
		const [ready, setReady] = useState(false);

		useEffect(() => {
			setReady(true);
		}, []);

		useEffect(() => {
			if (boxReference.current && ready) {
				boxReference.current.scrollToBottom();
			}
		}, [ready]);

		return (
			<Box
				ref={boxReference}
				width={10}
				height={3}
				overflow="scroll"
				flexDirection="column"
			>
				{Array.from({length: 10}, (_, i) => (
					<Box key={i} flexShrink={0}>
						<Text>Line {i}</Text>
					</Box>
				))}
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});

	await delay(100);

	const output = stdout.get();
	t.true(output.includes('Line 7'));
	t.true(output.includes('Line 8'));
	t.true(output.includes('Line 9'));
	t.false(output.includes('Line 0'));
});
