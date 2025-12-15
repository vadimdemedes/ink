import React, {useRef, useEffect, useState} from 'react';
import test from 'ava';
import delay from 'delay';
import {Box, Text, render, type BoxRef} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('sticky element stays at top when scrolled', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxRef = useRef<BoxRef>(null);
		const [ready, setReady] = useState(false);

		useEffect(() => {
			setReady(true);
		}, []);

		useEffect(() => {
			if (ready && boxRef.current) {
				boxRef.current.scrollTo({y: 5});
			}
		}, [ready]);

		return (
			<Box
				ref={boxRef}
				width={20}
				height={5}
				overflow="scroll"
				flexDirection="column"
			>
				<Box position="sticky" top={0} flexShrink={0}>
					<Text>HEADER</Text>
				</Box>
				{Array.from({length: 20}, (_, i) => (
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
	const lines = output.split('\n');

	t.true(lines[0]?.includes('HEADER'));
	t.false(output.includes('Item 0'));
	t.false(output.includes('Item 1'));
	t.true(output.includes('Item 5') || output.includes('Item 4'));
});

test('sticky element follows normal flow when not scrolled', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		return (
			<Box width={20} height={5} overflow="scroll" flexDirection="column">
				<Box flexShrink={0}>
					<Text>Before</Text>
				</Box>
				<Box position="sticky" top={0} flexShrink={0}>
					<Text>STICKY</Text>
				</Box>
				<Box flexShrink={0}>
					<Text>After</Text>
				</Box>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});
	await delay(50);

	const output = stdout.get();
	const lines = output.split('\n');

	t.true(lines[0]?.includes('Before'));
	t.true(lines[1]?.includes('STICKY'));
	t.true(lines[2]?.includes('After'));
});

test('sticky element without scroll container behaves normally', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		return (
			<Box width={20} height={5} flexDirection="column">
				<Box flexShrink={0}>
					<Text>Before</Text>
				</Box>
				<Box position="sticky" top={0} flexShrink={0}>
					<Text>STICKY</Text>
				</Box>
				<Box flexShrink={0}>
					<Text>After</Text>
				</Box>
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});
	await delay(50);

	const output = stdout.get();
	const lines = output.split('\n');

	t.true(lines[0]?.includes('Before'));
	t.true(lines[1]?.includes('STICKY'));
	t.true(lines[2]?.includes('After'));
});

test('sticky element with border stays at top', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxRef = useRef<BoxRef>(null);
		const [ready, setReady] = useState(false);

		useEffect(() => {
			setReady(true);
		}, []);

		useEffect(() => {
			if (ready && boxRef.current) {
				boxRef.current.scrollTo({y: 3});
			}
		}, [ready]);

		return (
			<Box
				ref={boxRef}
				width={20}
				height={7}
				overflow="scroll"
				flexDirection="column"
				borderStyle="round"
			>
				<Box position="sticky" top={0} flexShrink={0}>
					<Text>HEADER</Text>
				</Box>
				{Array.from({length: 15}, (_, i) => (
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
	t.true(output.includes('HEADER'));
	t.false(output.includes('Item 0'));
	t.false(output.includes('Item 1'));
});

test('multiple sticky elements with different offsets', async t => {
	const stdout = createStdout(100);

	function TestComponent() {
		const boxRef = useRef<BoxRef>(null);
		const [ready, setReady] = useState(false);

		useEffect(() => {
			setReady(true);
		}, []);

		useEffect(() => {
			if (ready && boxRef.current) {
				boxRef.current.scrollTo({y: 8});
			}
		}, [ready]);

		return (
			<Box
				ref={boxRef}
				width={20}
				height={6}
				overflow="scroll"
				flexDirection="column"
			>
				<Box position="sticky" top={0} flexShrink={0}>
					<Text>Header 1</Text>
				</Box>
				{Array.from({length: 5}, (_, i) => (
					<Box key={`a${i}`} flexShrink={0}>
						<Text>A-{i}</Text>
					</Box>
				))}
				<Box position="sticky" top={1} flexShrink={0}>
					<Text>Header 2</Text>
				</Box>
				{Array.from({length: 10}, (_, i) => (
					<Box key={`b${i}`} flexShrink={0}>
						<Text>B-{i}</Text>
					</Box>
				))}
			</Box>
		);
	}

	render(<TestComponent />, {stdout, debug: true});
	await delay(100);

	const output = stdout.get();
	const lines = output.split('\n');

	t.true(lines[0]?.includes('Header 1'));
	t.true(lines[1]?.includes('Header 2'));
});
