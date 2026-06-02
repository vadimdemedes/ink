import React, {useState, useRef, useEffect} from 'react';
import test from 'ava';
import delay from 'delay';
import {Box, Text, render, getBoundingBox, type DOMElement} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('get bounding box of root-level element', async t => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const box = getBoundingBox(ref.current);

			if (box) {
				setResult(`${box.x},${box.y},${box.width},${box.height}`);
			}
		}, []);

		return (
			<Box ref={ref}>
				<Text>Box: {result}</Text>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	t.is((stdout.write as any).lastCall.args[0], 'Box: 0,0,100,1');
});

test('get bounding box of nested element with offset', async t => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const box = getBoundingBox(ref.current);

			if (box) {
				setResult(`${box.x},${box.y}`);
			}
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
	t.true(lastWrite.includes('Nested: 4,1'));
});

test('get bounding box of deeply nested element accumulates offsets', async t => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const box = getBoundingBox(ref.current);

			if (box) {
				setResult(`${box.x},${box.y}`);
			}
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
	// paddingLeft: 2 + 3 = 5, paddingTop: 1 + 2 = 3
	t.true(lastWrite.includes('Deep: 5,3'));
});

test('returns dimensions matching measureElement', async t => {
	const stdout = createStdout();

	function Test() {
		const [result, setResult] = useState('');
		const ref = useRef<DOMElement>(null);

		useEffect(() => {
			if (!ref.current) {
				return;
			}

			const box = getBoundingBox(ref.current);

			if (box) {
				setResult(`${box.width},${box.height}`);
			}
		}, []);

		return (
			<Box flexDirection="column">
				<Box ref={ref} width={20} height={3}>
					<Text>Size: {result}</Text>
				</Box>
			</Box>
		);
	}

	render(<Test />, {stdout, debug: true});
	await delay(100);

	const lastWrite = (stdout.write as any).lastCall.args[0] as string;
	t.true(lastWrite.includes('Size: 20,3'));
});

test('returns undefined for element without yoga node', t => {
	const node = {yogaNode: undefined, parentNode: undefined} as DOMElement;
	const result = getBoundingBox(node);
	t.is(result, undefined);
});
