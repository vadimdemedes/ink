import React from 'react';
import test from 'ava';
import {Box, Text, render} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

test('set width', t => {
	const output = renderToString(
		<Box>
			<Box width={5}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A    B');
});

test('set width in percent', t => {
	const output = renderToString(
		<Box width={10}>
			<Box width="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A    B');
});

test('set min width', t => {
	const smallerOutput = renderToString(
		<Box>
			<Box minWidth={5}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(smallerOutput, 'A    B');

	const largerOutput = renderToString(
		<Box>
			<Box minWidth={2}>
				<Text>AAAAA</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(largerOutput, 'AAAAAB');
});

test.failing('set min width in percent', t => {
	const output = renderToString(
		<Box width={10}>
			<Box minWidth="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A    B');
});

test('set height', t => {
	const output = renderToString(
		<Box height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB\n\n\n');
});

test('set height in percent', t => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box height="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\n\n\nB\n\n');
});

test('cut text over the set height', t => {
	const output = renderToString(
		<Box height={2}>
			<Text>AAAABBBBCCCC</Text>
		</Box>,
		{columns: 4},
	);

	t.is(output, 'AAAA\nBBBB');
});

test('set min height', t => {
	const smallerOutput = renderToString(
		<Box minHeight={4}>
			<Text>A</Text>
		</Box>,
	);

	t.is(smallerOutput, 'A\n\n\n');

	const largerOutput = renderToString(
		<Box minHeight={2}>
			<Box height={4}>
				<Text>A</Text>
			</Box>
		</Box>,
	);

	t.is(largerOutput, 'A\n\n\n');
});

test('set min height in percent', t => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box minHeight="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\n\n\nB\n\n');
});

test('set max width', t => {
	const constrainedOutput = renderToString(
		<Box>
			<Box maxWidth={3}>
				<Text>AAAAA</Text>
			</Box>
			<Text>B</Text>
		</Box>,
		{columns: 10},
	);

	t.is(constrainedOutput, 'AAAB\nAA');

	const unconstrainedOutput = renderToString(
		<Box>
			<Box maxWidth={10}>
				<Text>AAA</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(unconstrainedOutput, 'AAAB');
});

test('clears maxWidth on rerender', t => {
	const stdout = createStdout();

	function Test({maxWidth}: {readonly maxWidth?: number}) {
		return (
			<Box>
				<Box maxWidth={maxWidth}>
					<Text>AAAAA</Text>
				</Box>
				<Text>B</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test maxWidth={3} />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], 'AAAB\nAA');

	rerender(<Test maxWidth={undefined} />);
	t.is(stdout.write.lastCall.args[0], 'AAAAAB');
});

test('set max height', t => {
	const constrainedOutput = renderToString(
		<Box maxHeight={2}>
			<Box height={4}>
				<Text>A</Text>
			</Box>
		</Box>,
	);

	t.is(constrainedOutput, 'A\n');

	const unconstrainedOutput = renderToString(
		<Box maxHeight={4}>
			<Text>A</Text>
		</Box>,
	);

	t.is(unconstrainedOutput, 'A');
});

test('clears maxHeight on rerender', t => {
	const stdout = createStdout();

	function Test({maxHeight}: {readonly maxHeight?: number}) {
		return (
			<Box maxHeight={maxHeight}>
				<Box height={4}>
					<Text>A</Text>
				</Box>
			</Box>
		);
	}

	const {rerender} = render(<Test maxHeight={2} />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], 'A\n');

	rerender(<Test maxHeight={undefined} />);
	t.is(stdout.write.lastCall.args[0], 'A\n\n\n');
});

test('set aspect ratio with width', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box width={8} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.is(output, '┌──────┐\n│X     │\n│      │\n└──────┘\nY');
});

test('set aspect ratio with height', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box height={3} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.is(output, '┌────┐\n│X   │\n└────┘\nY');
});

test('set aspect ratio with width and height', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box width={8} height={3} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.is(output, '┌────┐\n│X   │\n└────┘\nY');
});

test('set aspect ratio with maxHeight constraint', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box width={10} maxHeight={3} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.is(output, '┌────┐\n│X   │\n└────┘\nY');
});

test('clears aspectRatio on rerender', t => {
	const stdout = createStdout();

	function Test({aspectRatio}: {readonly aspectRatio?: number}) {
		return (
			<Box flexDirection="column">
				<Box width={8} aspectRatio={aspectRatio} borderStyle="single">
					<Text>X</Text>
				</Box>
				<Text>Y</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test aspectRatio={2} />, {
		stdout,
		debug: true,
	});

	t.is(
		stdout.write.lastCall.args[0],
		'┌──────┐\n│X     │\n│      │\n└──────┘\nY',
	);

	rerender(<Test aspectRatio={undefined} />);
	t.is(stdout.write.lastCall.args[0], '┌──────┐\n│X     │\n└──────┘\nY');
});

test.failing('set max width in percent', t => {
	const output = renderToString(
		<Box width={10}>
			<Box maxWidth="50%">
				<Text>AAAAAAAAAA</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AAAAAB');
});

test('set max height in percent', t => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box maxHeight="50%">
				<Box height={6}>
					<Text>A</Text>
				</Box>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\n\n\nB\n\n');
});

// Concurrent mode tests
test('set width - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box>
			<Box width={5}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A    B');
});

test('set height - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB\n\n\n');
});
