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

test('measure element position', async t => {
	const stdout = createStdout();

	function Test() {
		const [metrics, setMetrics] = useState({x: 0, y: 0, width: 0, height: 0});
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			setMetrics(measureElement(ref.current));
		}, []);

		return (
			<Box flexDirection="column">
				<Text>Header</Text>
				<Box ref={ref}>
					<Text>
						X: {metrics.x} Y: {metrics.y} W: {metrics.width} H: {metrics.height}
					</Text>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	t.is((stdout.write as any).lastCall.args[0], 'Header\nX: 0 Y: 1 W: 100 H: 1');
});

test('measure element position includes parent border and padding offsets', async t => {
	const stdout = createStdout();

	function Test() {
		const [metrics, setMetrics] = useState({x: 0, y: 0});
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const {x, y} = measureElement(ref.current);
			setMetrics({x, y});
		}, []);

		return (
			<Box borderStyle="single" paddingLeft={2} paddingTop={1}>
				<Box ref={ref}>
					<Text>
						X: {metrics.x} Y: {metrics.y}
					</Text>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	const output = (stdout.write as any).lastCall.args[0] as string;
	t.true(output.includes('X: 3 Y: 2'));
});
