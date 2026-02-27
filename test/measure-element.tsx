import React, {useState, useRef, useEffect, useLayoutEffect} from 'react';
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

test('measure element after state update', async t => {
	const stdout = createStdout();
	let setTestItems!: (items: string[]) => void;

	function Test() {
		const [items, setItems] = useState<string[]>([]);
		const [height, setHeight] = useState(0);
		const ref = useRef<DOMElement>(null);

		setTestItems = setItems;

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			setHeight(measureElement(ref.current).height);
		}, [items.length]);

		return (
			<Box flexDirection="column">
				<Box ref={ref} flexDirection="column">
					{items.map(item => (
						<Text key={item}>{item}</Text>
					))}
				</Box>
				<Text>Height: {height}</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(50);

	setTestItems(['line 1', 'line 2', 'line 3']);
	await delay(50);

	t.is(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).trim(),
		'line 1\nline 2\nline 3\nHeight: 3',
	);
});

test('measure element after multiple state updates', async t => {
	const stdout = createStdout();
	let setTestItems!: (items: string[]) => void;

	function Test() {
		const [items, setItems] = useState<string[]>([]);
		const [height, setHeight] = useState(0);
		const ref = useRef<DOMElement>(null);

		setTestItems = setItems;

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			setHeight(measureElement(ref.current).height);
		}, [items.length]);

		return (
			<Box flexDirection="column">
				<Box ref={ref} flexDirection="column">
					{items.map(item => (
						<Text key={item}>{item}</Text>
					))}
				</Box>
				<Text>Height: {height}</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(50);

	setTestItems(['line 1', 'line 2', 'line 3']);
	await delay(50);

	setTestItems(['line 1']);
	await delay(50);

	t.is(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).trim(),
		'line 1\nHeight: 1',
	);
});

test('measure element in useLayoutEffect after state update', async t => {
	const stdout = createStdout();
	let setTestItems!: (items: string[]) => void;

	function Test() {
		const [items, setItems] = useState<string[]>([]);
		const [height, setHeight] = useState(0);
		const ref = useRef<DOMElement>(null);

		setTestItems = setItems;

		useLayoutEffect(() => {
			if (!ref.current) {
				return;
			}

			setHeight(measureElement(ref.current).height);
		}, [items.length]);

		return (
			<Box flexDirection="column">
				<Box ref={ref} flexDirection="column">
					{items.map(item => (
						<Text key={item}>{item}</Text>
					))}
				</Box>
				<Text>Height: {height}</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(50);

	setTestItems(['line 1', 'line 2', 'line 3']);
	await delay(50);

	t.is(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).trim(),
		'line 1\nline 2\nline 3\nHeight: 3',
	);
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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const writes: string[] = (stdout.write as any)
		.getCalls()
		.map((c: any) => c.args[0] as string)
		.filter(
			(w: string) =>
				!w.startsWith('\u001B[?25') && !w.startsWith('\u001B[?2026'),
		);
	const lastContentWrite = writes.at(-1)!;

	t.is(stripAnsi(lastContentWrite).trim(), 'Width: 100');
});
