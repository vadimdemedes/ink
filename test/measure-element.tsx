import React, {useState, useRef, useEffect} from 'react';
import test from 'ava';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import {
	Box,
	Text,
	render,
	measureElement,
	type DOMElement,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('measure element', async t => {
	const stdout = createStdout();

	function Test() {
		const [width, setWidth] = useState(0);
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			setWidth(measureElement(ref.current).width);
		}, []);

		return (
			<Box ref={ref}>
				<Text>Width: {width}</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	t.is((stdout.write as any).firstCall.args[0], 'Width: 0');
	await delay(100);
	t.is((stdout.write as any).lastCall.args[0], 'Width: 100');
});

test.serial('calculate layout while rendering is throttled', async t => {
	const stdout = createStdout();

	function Test() {
		const [width, setWidth] = useState(0);
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			setWidth(measureElement(ref.current).width);
		}, []);

		return (
			<Box ref={ref}>
				<Text>Width: {width}</Text>
			</Box>
		);
	}

	const {rerender} = render(null, {stdout, patchConsole: false});
	rerender(<Test />);
	await delay(50);

	t.is(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).trim(),
		'Width: 100',
	);
});

const tallText = Array.from({length: 20})
	.map((_, i) => `line ${i}`)
	.join('\n');

const longText = 'line '.repeat(20).trim();

test('measure element in a vertical scrollable container', async t => {
	const stdout = createStdout();

	function Test() {
		const [layout, setLayout] = useState({
			width: 0,
			height: 0,
			innerWidth: 0,
			innerHeight: 0,
			scrollHeight: 0,
			scrollWidth: 0,
		});
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (ref.current) {
				const measurement = measureElement(ref.current);
				setLayout(measurement);
			}
		}, []);

		return (
			<Box flexDirection="column">
				<Text>
					Width: {layout.width}, Height: {layout.height}, innerWidth:{' '}
					{layout.innerWidth}, innerHeight: {layout.innerHeight}, scrollHeight:{' '}
					{layout.scrollHeight}, scrollWidth: {layout.scrollWidth}
				</Text>
				<Box
					ref={ref}
					width={15}
					height={5}
					overflowY="scroll"
					alignItems="flex-start"
				>
					<Box flexShrink={0}>
						<Text>{tallText}</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	let output = stripAnsi((stdout.write as any).firstCall.args[0]);
	let firstLine = output.split('\n')[0].trim();
	t.is(
		firstLine,
		'Width: 0, Height: 0, innerWidth: 0, innerHeight: 0, scrollHeight: 0, scrollWidth: 0',
	);

	await delay(100);

	output = stripAnsi((stdout.write as any).lastCall.args[0]);
	firstLine = output.split('\n')[0].trim();
	t.is(
		firstLine,
		'Width: 15, Height: 5, innerWidth: 14, innerHeight: 5, scrollHeight: 20, scrollWidth: 7',
	);
});

test('measure element in a horizontal scrollable container', async t => {
	const stdout = createStdout();

	function Test() {
		const [layout, setLayout] = useState({
			width: 0,
			height: 0,
			innerWidth: 0,
			innerHeight: 0,
			scrollHeight: 0,
			scrollWidth: 0,
		});
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (ref.current) {
				const measurement = measureElement(ref.current);
				setLayout(measurement);
			}
		}, []);

		return (
			<Box flexDirection="column">
				<Text>
					Width: {layout.width}, Height: {layout.height}, innerWidth:{' '}
					{layout.innerWidth}, innerHeight: {layout.innerHeight}, scrollHeight:{' '}
					{layout.scrollHeight}, scrollWidth: {layout.scrollWidth}
				</Text>
				<Box
					ref={ref}
					width={15}
					height={5}
					overflowX="scroll"
					alignItems="flex-start"
				>
					<Box flexShrink={0}>
						<Text>{longText}</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	let output = stripAnsi((stdout.write as any).firstCall.args[0]);
	let firstLine = output.split('\n')[0].trim();
	t.is(
		firstLine,
		'Width: 0, Height: 0, innerWidth: 0, innerHeight: 0, scrollHeight: 0, scrollWidth: 0',
	);

	await delay(100);

	output = stripAnsi((stdout.write as any).lastCall.args[0]);
	firstLine = output.split('\n')[0].trim();
	t.is(
		firstLine,
		'Width: 15, Height: 5, innerWidth: 15, innerHeight: 4, scrollHeight: 1, scrollWidth: 99',
	);
});
