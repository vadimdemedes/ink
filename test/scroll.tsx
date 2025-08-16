import EventEmitter from 'node:events';
import React, {useState} from 'react';
import test from 'ava';
import {spy, stub} from 'sinon';
import delay from 'delay';
import {Box, Text, render, useInput} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

const longText = 'line '.repeat(20).trim();
const tallText = Array.from({length: 20})
	.map((_, i) => `line ${i}`)
	.join('\n');

const createStdin = () => {
	const stdin = new EventEmitter() as unknown as NodeJS.WriteStream;
	stdin.isTTY = true;
	stdin.setRawMode = spy();
	stdin.setEncoding = () => {};
	stdin.read = stub();
	stdin.unref = () => {};
	stdin.ref = () => {};

	return stdin;
};

const emitReadable = (stdin: NodeJS.WriteStream, chunk: string) => {
	/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
	const read = stdin.read as ReturnType<typeof stub>;
	read.onCall(0).returns(chunk);
	read.onCall(1).returns(null);
	stdin.emit('readable');
	read.reset();
	/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
};

test('vertical scroll', t => {
	const output = renderToString(
		<Box
			width={10}
			height={5}
			overflowY="scroll"
			borderStyle="round"
			paddingX={1}
		>
			<Text>{tallText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('vertical scroll with scrollTop', t => {
	const output = renderToString(
		<Box
			width={10}
			height={5}
			overflowY="scroll"
			borderStyle="round"
			paddingX={1}
			scrollTop={10}
		>
			<Text>{tallText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('vertical scroll to bottom', t => {
	const output = renderToString(
		<Box
			width={10}
			height={5}
			overflowY="scroll"
			borderStyle="round"
			paddingX={1}
			scrollTop={100} // Should be clamped to max scroll top
		>
			<Text>{tallText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('horizontal scroll', t => {
	const output = renderToString(
		<Box
			width={15}
			height={3}
			overflowX="scroll"
			borderStyle="round"
			paddingY={1}
		>
			<Text>{longText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('horizontal scroll with scrollLeft', t => {
	const output = renderToString(
		<Box
			width={15}
			height={3}
			overflowX="scroll"
			borderStyle="round"
			paddingY={1}
			scrollLeft={20}
		>
			<Text>{longText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('horizontal scroll to end', t => {
	const output = renderToString(
		<Box
			width={15}
			height={3}
			overflowX="scroll"
			borderStyle="round"
			paddingY={1}
			scrollLeft={1000} // Should be clamped to max scroll left
		>
			<Text>{longText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('vertical and horizontal scroll', t => {
	const output = renderToString(
		<Box
			width={15}
			height={5}
			overflow="scroll"
			borderStyle="round"
			padding={1}
		>
			<Box width={100} height={100}>
				<Text>Scroll me</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

test('vertical and horizontal scroll with scrollTop and scrollLeft', t => {
	const output = renderToString(
		<Box
			width={15}
			height={5}
			overflow="scroll"
			borderStyle="round"
			padding={1}
			scrollTop={50}
			scrollLeft={50}
		>
			<Box width={100} height={100}>
				<Text>Scroll me</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

test('initial scroll position bottom', t => {
	const output = renderToString(
		<Box
			width={10}
			height={5}
			overflowY="scroll"
			borderStyle="round"
			paddingX={1}
			initialScrollPosition="bottom"
		>
			<Text>{tallText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('custom scrollbar', t => {
	const output = renderToString(
		<Box
			width={10}
			height={5}
			overflowY="scroll"
			borderStyle="round"
			paddingX={1}
			scrollbarThumbCharacter="="
			scrollbarTrackCharacter=" "
			scrollbarThumbColor="red"
			scrollbarTrackColor="blue"
		>
			<Text>{tallText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('dynamic scroll update', t => {
	const stdout = createStdout();

	function ScrollableContent({scrollTop}: {readonly scrollTop: number}) {
		return (
			<Box
				width={10}
				height={5}
				overflowY="scroll"
				borderStyle="round"
				scrollTop={scrollTop}
			>
				<Text>{tallText}</Text>
			</Box>
		);
	}

	const {rerender} = render(<ScrollableContent scrollTop={0} />, {
		stdout,
		debug: true,
	});

	const firstRender = (stdout.write as any).lastCall.args[0] as string;

	rerender(<ScrollableContent scrollTop={5} />);
	const secondRender = (stdout.write as any).lastCall.args[0] as string;

	t.snapshot(firstRender, 'initial render');
	t.snapshot(secondRender, 'after scroll');
});

test('scroll with flexGrow', t => {
	const output = renderToString(
		<Box width={20} height={5}>
			<Box flexGrow={1} overflowY="scroll" borderStyle="round">
				<Text>{tallText}</Text>
			</Box>
			<Text>Side</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('scroll with padding', t => {
	const output = renderToString(
		<Box
			width={15}
			height={5}
			overflowY="scroll"
			borderStyle="round"
			padding={2}
		>
			<Text>{tallText}</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('no scrollbar when content is smaller than container', t => {
	const output = renderToString(
		<Box width={20} height={10} overflow="scroll" borderStyle="round">
			<Text>Fit</Text>
		</Box>,
	);

	t.snapshot(output);
});

test('nested scrolling', t => {
	const output = renderToString(
		<Box
			width={20}
			height={10}
			overflow="scroll"
			borderStyle="double"
			padding={1}
		>
			<Box
				width={40}
				height={20}
				overflow="scroll"
				borderStyle="round"
				padding={1}
			>
				<Text>Nested</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

function InteractiveScrollableContent() {
	const [scrollTop, setScrollTop] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);

	useInput((_, key) => {
		if (key.upArrow) {
			setScrollTop(s => s - 1);
		}

		if (key.downArrow) {
			setScrollTop(s => s + 1);
		}

		if (key.leftArrow) {
			setScrollLeft(s => s - 1);
		}

		if (key.rightArrow) {
			setScrollLeft(s => s + 1);
		}
	});

	return (
		<Box
			width={15}
			height={5}
			overflow="scroll"
			borderStyle="round"
			scrollTop={scrollTop}
			scrollLeft={scrollLeft}
		>
			<Box width={100} height={100}>
				<Text>
					ScrollTop: {scrollTop}, ScrollLeft: {scrollLeft}
				</Text>
			</Box>
		</Box>
	);
}

test('interactive scroll', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	render(<InteractiveScrollableContent />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	const initialRender = (stdout.write as any).lastCall.args[0] as string;
	t.snapshot(initialRender, 'initial render');

	emitReadable(stdin, '\u001B[B'); // Down arrow
	await delay(100);
	const afterScrollDown = (stdout.write as any).lastCall.args[0] as string;
	t.snapshot(afterScrollDown, 'after scrolling down');

	emitReadable(stdin, '\u001B[C'); // Right arrow
	await delay(100);
	const afterScrollRight = (stdout.write as any).lastCall.args[0] as string;
	t.snapshot(afterScrollRight, 'after scrolling right');
});
