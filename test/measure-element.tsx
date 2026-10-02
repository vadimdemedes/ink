import test, {type TestContext} from 'node:test';
import React, {useState, useRef, useEffect, useLayoutEffect} from 'react';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import {
	Box,
	Static,
	Text,
	render,
	measureElement,
	type DOMElement,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('measure element', async (t: TestContext) => {
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
	t.assert.strictEqual((stdout.write as any).firstCall.args[0], 'Width: 0');
	await delay(100);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Width: 100');
});

test('measure element after state update', async (t: TestContext) => {
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

	t.assert.strictEqual(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).trim(),
		'line 1\nline 2\nline 3\nHeight: 3',
	);
});

test('measure element after multiple state updates', async (t: TestContext) => {
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

	t.assert.strictEqual(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).trim(),
		'line 1\nHeight: 1',
	);
});

test('measure element in useLayoutEffect after state update', async (t: TestContext) => {
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

	t.assert.strictEqual(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).trim(),
		'line 1\nline 2\nline 3\nHeight: 3',
	);
});

test('measure position of nested element with padding offset', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const metrics = measureElement(ref.current);
			setResult(`${metrics.x},${metrics.y}`);
		}, []);

		return (
			<Box flexDirection="column">
				<Text>Header</Text>
				<Box paddingLeft={4}>
					<Box ref={ref}>
						<Text>Nested: {result}</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	const lastWrite = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(lastWrite.includes('Nested: 4,1'));
});

test('measure position of deeply nested element accumulates offsets', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const metrics = measureElement(ref.current);
			setResult(`${metrics.x},${metrics.y}`);
		}, []);

		return (
			<Box paddingLeft={2} paddingTop={1}>
				<Box paddingLeft={3} paddingTop={2}>
					<Box ref={ref}>
						<Text>Deep: {result}</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	const lastWrite = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(lastWrite.includes('Deep: 5,3'));
});

test('measure position accounts for margin offset', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const metrics = measureElement(ref.current);
			setResult(`${metrics.x},${metrics.y}`);
		}, []);

		return (
			<Box flexDirection="column">
				<Box marginLeft={5} marginTop={2}>
					<Box ref={ref}>
						<Text>Margin: {result}</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	const lastWrite = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(lastWrite.includes('Margin: 5,2'));
});

test('measure position — sibling offset gives correct y', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const metrics = measureElement(ref.current);
			setResult(`${metrics.x},${metrics.y}`);
		}, []);

		return (
			<Box flexDirection="column">
				<Text>Line 1</Text>
				<Text>Line 2</Text>
				<Box ref={ref}>
					<Text>Third: {result}</Text>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	const lastWrite = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(lastWrite.includes('Third: 0,2'));
});

test('Static does not affect layout-tree coordinates', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const metrics = measureElement(ref.current);
			setResult(`${metrics.x},${metrics.y}`);
		}, []);

		return (
			<Box flexDirection="column">
				<Static items={['Static A', 'Static B']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Box ref={ref}>
					<Text>Live: {result}</Text>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	const lastWrite = (stdout.write as any).lastCall.args[0] as string;
	// Static uses position:absolute so it doesn't affect live layout coordinates
	t.assert.ok(lastWrite.includes('Live: 0,0'));
});

test('measure element returns zeros for node without yoga', (t: TestContext) => {
	const node = {
		yogaNode: undefined,
		parentNode: undefined,
		nodeName: 'ink-box',
		attributes: {},
		childNodes: [],
		style: {},
	} as unknown as DOMElement;

	const metrics = measureElement(node);
	t.assert.deepStrictEqual(metrics, {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		clientWidth: 0,
		clientHeight: 0,
	});
});

test('calculate layout while rendering is throttled', async (t: TestContext) => {
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
				!w.startsWith('\u{1B}[?25') && !w.startsWith('\u{1B}[?2026'),
		);
	const lastContentWrite = writes.at(-1)!;

	t.assert.strictEqual(stripAnsi(lastContentWrite).trim(), 'Width: 100');
});

test('measure element client size with overflowing content', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const [metrics, setMetrics] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const {clientWidth, clientHeight} = measureElement(ref.current);

			setMetrics(`client:${clientWidth}x${clientHeight}`);
		}, []);

		return (
			<Box flexDirection="column">
				<Box
					ref={ref}
					width={12}
					height={2}
					overflow="hidden"
					flexDirection="column"
				>
					<Box width={20} height={5} flexShrink={0} flexGrow={0} />
				</Box>
				<Text>{metrics}</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	t.assert.ok(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).includes(
			'client:12x2',
		),
	);
});

test('measure element client size excludes borders', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const [metrics, setMetrics] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const {width, height, clientWidth, clientHeight} = measureElement(
				ref.current,
			);

			setMetrics(`${width}x${height} client:${clientWidth}x${clientHeight}`);
		}, []);

		return (
			<Box flexDirection="column">
				<Box ref={ref} width={12} height={4} borderStyle="round" />
				<Text>{metrics}</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	t.assert.ok(
		stripAnsi((stdout.write as any).lastCall.firstArg as string).includes(
			'12x4 client:10x2',
		),
	);
});
