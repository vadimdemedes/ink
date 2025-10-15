/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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

const verticalScrollTests = [
	{
		name: 'vertical scroll',
		props: {
			width: 15,
		},
	},
	{
		name: 'vertical scroll narrow',
		props: {
			width: 9,
		},
	},
	{
		name: 'vertical scroll narrow with padding for scrollbar',
		props: {
			width: 9,
		},
	},
	{
		name: 'vertical scroll with scrollTop',
		props: {
			width: 15,
			scrollTop: 10,
		},
	},
	{
		name: 'vertical scroll to bottom',
		props: {
			width: 15,
			scrollTop: Number.MAX_SAFE_INTEGER,
		},
	},
];

for (const {name, props} of verticalScrollTests) {
	test(name, t => {
		const output = renderToString(
			<Box
				height={5}
				overflowY="scroll"
				overflowX="hidden"
				borderStyle="round"
				flexDirection="column"
				{...props}
			>
				<Box paddingX={1} flexDirection="column" flexShrink={0} width={100}>
					<Text>{tallText}</Text>
				</Box>
			</Box>,
		);

		t.snapshot(output);
	});
}

const horizontalScrollTests = [
	{
		name: 'horizontal scroll',
		props: {},
	},
	{
		name: 'horizontal scroll with scrollLeft',
		props: {
			scrollLeft: 9,
		},
	},
	{
		name: 'horizontal scroll to end',
		props: {
			scrollLeft: Number.MAX_SAFE_INTEGER,
		},
	},
];

for (const {name, props} of horizontalScrollTests) {
	test(name, t => {
		const output = renderToString(
			<Box
				width={15}
				height={4}
				overflowX="scroll"
				overflowY="hidden"
				borderStyle="round"
				flexDirection="row"
				{...props}
			>
				<Box flexDirection="column" flexShrink={0} paddingX={1}>
					<Text>The quick brown fox jumps over the lazy dog</Text>
				</Box>
			</Box>,
		);

		t.snapshot(output);
	});
}

const bothAxesScrollTests = [
	{
		name: 'vertical and horizontal scroll',
		props: {},
	},
	{
		name: 'vertical and horizontal scroll with scrollTop and scrollLeft',
		props: {
			scrollTop: 50,
			scrollLeft: 50,
		},
	},
];

for (const {name, props} of bothAxesScrollTests) {
	test(name, t => {
		const output = renderToString(
			<Box
				width={15}
				height={5}
				overflow="scroll"
				borderStyle="round"
				padding={1}
				flexDirection="column"
				{...props}
			>
				<Box width={100} height={100} flexShrink={0}>
					<Text>Scroll me</Text>
				</Box>
			</Box>,
		);

		t.snapshot(output);
	});
}

test('dynamic scroll update', t => {
	const stdout = createStdout();

	function ScrollableContent({scrollTop}: {readonly scrollTop: number}) {
		return (
			<Box
				width={15}
				height={5}
				overflowY="scroll"
				borderStyle="round"
				scrollTop={scrollTop}
				flexDirection="column"
			>
				<Box flexDirection="column" flexShrink={0}>
					<Text>{tallText}</Text>
				</Box>
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
			<Box
				flexGrow={1}
				overflowY="scroll"
				borderStyle="round"
				flexDirection="column"
				scrollTop={10}
			>
				<Box flexDirection="column" flexShrink={0}>
					<Text>{tallText}</Text>
				</Box>
			</Box>
			<Text>Text on Side</Text>
		</Box>,
	);

	t.snapshot(output);
});

const scrollWithPaddingTests = [
	{
		name: 'scroll with padding and scrollTop 0',
		props: {
			scrollTop: 0,
		},
	},
	{
		name: 'scroll with padding and scrollTop 1',
		props: {
			scrollTop: 1,
		},
	},
	{
		name: 'scroll with padding and scrollTop 2',
		props: {
			scrollTop: 2,
		},
	},
	{
		name: 'scroll with padding and scrollTop max',
		props: {
			scrollTop: Number.MAX_SAFE_INTEGER,
		},
	},
];

for (const {name, props} of scrollWithPaddingTests) {
	test(name, t => {
		const output = renderToString(
			<Box
				width={15}
				height={7}
				overflowY="scroll"
				borderStyle="round"
				padding={2}
				flexDirection="column"
				overflow="hidden"
				{...props}
			>
				<Box flexDirection="column" flexShrink={0}>
					<Text>{tallText}</Text>
				</Box>
			</Box>,
		);

		t.snapshot(output);
	});
}

test('no scrollbar when content is smaller than container', t => {
	const output = renderToString(
		<Box
			width={20}
			height={10}
			overflow="scroll"
			borderStyle="round"
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Fit</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

const nestedScrollingTests = [
	{
		name: 'nested scrolling inner scroll partially in view',
		props: {
			outerScrollTop: 15,
			innerScrollTop: 10,
		},
	},
	{
		name: 'nested scrolling inner fully in view',
		props: {
			outerScrollTop: 17,
			innerScrollTop: 12,
		},
	},
	{
		name: 'nested scrolling both to bottom',
		props: {
			outerScrollTop: Number.MAX_SAFE_INTEGER,
			innerScrollTop: Number.MAX_SAFE_INTEGER,
		},
	},
];

for (const {name, props} of nestedScrollingTests) {
	test(name, t => {
		const output = renderToString(
			<Box
				width={40}
				height={10}
				overflow="scroll"
				borderStyle="double"
				flexDirection="column"
				scrollTop={props.outerScrollTop}
			>
				<Box flexDirection="column" flexShrink={0}>
					<Box flexDirection="column">
						<Text>{tallText}</Text>
					</Box>
					<Box
						width={20}
						height={5}
						overflow="scroll"
						borderStyle="round"
						flexDirection="column"
						scrollTop={props.innerScrollTop}
					>
						<Box flexDirection="column" flexShrink={0}>
							<Text>{tallText}</Text>
						</Box>
					</Box>
					<Box flexDirection="column">
						<Text>Footer</Text>
					</Box>
				</Box>
			</Box>,
		);
		t.snapshot(output);
	});
}

test('scrollbar thumb color', t => {
	const output = renderToString(
		<Box
			width={15}
			height={5}
			overflow="scroll"
			borderStyle="round"
			scrollbarThumbColor="red"
		>
			<Box width={100} height={100} flexShrink={0}>
				<Text>Scroll me</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

test('overflow hidden', t => {
	const output = renderToString(
		<Box width={15} height={5} overflow="hidden" borderStyle="round">
			<Box width={100} height={100} flexShrink={0}>
				<Text>{tallText}</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

test('overflow visible', t => {
	const output = renderToString(
		<Box width={15} height={5} overflow="visible" borderStyle="round">
			<Box width={100} height={100} flexShrink={0}>
				<Text>{tallText}</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

test('no scrollbar when content is exactly the size of container', t => {
	const content = Array.from({length: 8})
		.map((_, i) => `line ${i}`)
		.join('\n');

	const output = renderToString(
		<Box
			width={20}
			height={10}
			overflow="scroll"
			borderStyle="round"
			flexDirection="column"
		>
			<Box width={18} height={8} flexShrink={0}>
				<Text>{content}</Text>
			</Box>
		</Box>,
	);

	t.snapshot(output);
});

test('dynamic content size causing scrollbars to appear and disappear', t => {
	const stdout = createStdout();

	function DynamicContent({large}: {readonly large: boolean}) {
		return (
			<Box width={15} height={5} overflow="scroll" borderStyle="round">
				<Box width={large ? 100 : 10} height={large ? 100 : 2} flexShrink={0}>
					<Text>Content</Text>
				</Box>
			</Box>
		);
	}

	const {rerender} = render(<DynamicContent large={false} />, {
		stdout,
		debug: true,
	});

	const initialRender = (stdout.write as any).lastCall.args[0] as string;
	t.snapshot(initialRender, 'initial render - no scrollbars');

	rerender(<DynamicContent large />);
	const withScrollbars = (stdout.write as any).lastCall.args[0] as string;
	t.snapshot(withScrollbars, 'after content grows - with scrollbars');

	rerender(<DynamicContent large={false} />);
	const withoutScrollbars = (stdout.write as any).lastCall.args[0] as string;
	t.snapshot(withoutScrollbars, 'after content shrinks - no scrollbars');
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
			flexDirection="column"
		>
			<Box width={100} height={100} flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
				<Text>
					ScrollTop: {scrollTop}, ScrollLeft: {scrollLeft}
				</Text>
				<Text>Line 3</Text>
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

const maxDimensionsScrollTests = [
	{
		name: 'max-width',
		props: {
			maxWidth: 10,
		},
	},
	{
		name: 'max-height',
		props: {
			maxHeight: 5,
		},
	},
	{
		name: 'max-width-percent',
		props: {
			maxWidth: '50%',
		},
	},
	{
		name: 'max-height-percent',
		props: {
			maxHeight: '50%',
		},
	},
	{
		name: 'max-width-and-max-height',
		props: {
			maxWidth: 10,
			maxHeight: 5,
		},
	},
	{
		name: 'max-width-and-max-height-percents',
		props: {
			maxWidth: '20%',
			maxHeight: '20%',
		},
	},
];

for (const {name, props} of maxDimensionsScrollTests) {
	test(name, t => {
		const output = renderToString(
			<Box overflow="scroll" borderStyle="round" {...props}>
				<Box width={100} height={100} flexShrink={0}>
					<Text>Scroll me</Text>
				</Box>
			</Box>,
		);

		t.snapshot(output);
	});
}
