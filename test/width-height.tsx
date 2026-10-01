import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

test('set width', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box width={5}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A    B');
});

test('set width in percent', (t: TestContext) => {
	const output = renderToString(
		<Box width={10}>
			<Box width="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A    B');
});

test('set width in fractional percent', (t: TestContext) => {
	const output = renderToString(
		<Box width={200}>
			<Box width="12.5%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
		{columns: 200},
	);

	t.assert.strictEqual(output, `A${' '.repeat(24)}B`);
});

test('set min width', (t: TestContext) => {
	const smallerOutput = renderToString(
		<Box>
			<Box minWidth={5}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(smallerOutput, 'A    B');

	const largerOutput = renderToString(
		<Box>
			<Box minWidth={2}>
				<Text>AAAAA</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(largerOutput, 'AAAAAB');
});

// TODO: Use `{expectFailure: '…'}` instead of `skip` when we target Node.js 24.
test(
	'set min width in percent',
	// eslint-disable-next-line node-test/no-skip-test -- Known failure. Node.js 22 does not support `expectFailure`.
	{skip: 'Yoga does not support percentage min width'},
	(t: TestContext) => {
		const output = renderToString(
			<Box width={10}>
				{/* @ts-expect-error Unsupported until Yoga fixes percentage width constraints. */}
				<Box minWidth="50%">
					<Text>A</Text>
				</Box>
				<Text>B</Text>
			</Box>,
		);

		t.assert.strictEqual(output, 'A    B');
	},
);

test('set width to zero', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box width={0}>
				<Text>hello</Text>
			</Box>
			<Text>|</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '|ello');
});

test('set width to zero with text below', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box>
				<Box width={0}>
					<Text>hello</Text>
				</Box>
				<Text>|</Text>
			</Box>
			<Text>next</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '|ello\nnext');
});

test('set width to a fraction of a column', (t: TestContext) => {
	const output = renderToString(
		<Box width={10} flexDirection="column">
			<Box>
				<Box width={0.25}>
					<Text>hello</Text>
				</Box>
				<Text>|</Text>
			</Box>
			<Text>next</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '|\ne\nl\nl\no\nnext');
});

test('truncated text at a positive fractional width keeps its row', (t: TestContext) => {
	const output = renderToString(
		<Box width={10} flexDirection="column">
			<Box width={0.5}>
				<Text wrap="truncate">hello</Text>
			</Box>
			<Text>next</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '…\nnext');
});

test('padding leaves no room for text', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box width={2} paddingX={1}>
				<Text>hello</Text>
			</Box>
			<Text>|</Text>
		</Box>,
	);

	t.assert.strictEqual(output, ' h|llo');
});

test('shrink text to zero width', (t: TestContext) => {
	const output = renderToString(
		<Box width={5}>
			<Box flexBasis={0} flexShrink={1}>
				<Text>hello</Text>
			</Box>
			<Box width={5}>
				<Text>world</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'world');
});

test('set height', (t: TestContext) => {
	const output = renderToString(
		<Box height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'AB\n\n\n');
});

test('set height in percent', (t: TestContext) => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box height="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\n\n\nB\n\n');
});

test('cut text over the set height', (t: TestContext) => {
	const output = renderToString(
		<Box height={2}>
			<Text>AAAABBBBCCCC</Text>
		</Box>,
		{columns: 4},
	);

	t.assert.strictEqual(output, 'AAAA\nBBBB');
});

test('set min height', (t: TestContext) => {
	const smallerOutput = renderToString(
		<Box minHeight={4}>
			<Text>A</Text>
		</Box>,
	);

	t.assert.strictEqual(smallerOutput, 'A\n\n\n');

	const largerOutput = renderToString(
		<Box minHeight={2}>
			<Box height={4}>
				<Text>A</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(largerOutput, 'A\n\n\n');
});

test('set min height in percent', (t: TestContext) => {
	const output = renderToString(
		<Box height={6} flexDirection="column">
			<Box minHeight="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\n\n\nB\n\n');
});

test('set max width', (t: TestContext) => {
	const constrainedOutput = renderToString(
		<Box>
			<Box maxWidth={3}>
				<Text>AAAAA</Text>
			</Box>
			<Text>B</Text>
		</Box>,
		{columns: 10},
	);

	t.assert.strictEqual(constrainedOutput, 'AAAB\nAA');

	const unconstrainedOutput = renderToString(
		<Box>
			<Box maxWidth={10}>
				<Text>AAA</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(unconstrainedOutput, 'AAAB');
});

test('clears maxWidth on rerender', (t: TestContext) => {
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

	t.assert.strictEqual(stdout.write.lastCall.args[0], 'AAAB\nAA');

	rerender(<Test maxWidth={undefined} />);
	t.assert.strictEqual(stdout.write.lastCall.args[0], 'AAAAAB');
});

test('set max height', (t: TestContext) => {
	const constrainedOutput = renderToString(
		<Box maxHeight={2}>
			<Box height={4}>
				<Text>A</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(constrainedOutput, 'A\n');

	const unconstrainedOutput = renderToString(
		<Box maxHeight={4}>
			<Text>A</Text>
		</Box>,
	);

	t.assert.strictEqual(unconstrainedOutput, 'A');
});

test('clears maxHeight on rerender', (t: TestContext) => {
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

	t.assert.strictEqual(stdout.write.lastCall.args[0], 'A\n');

	rerender(<Test maxHeight={undefined} />);
	t.assert.strictEqual(stdout.write.lastCall.args[0], 'A\n\n\n');
});

test('set aspect ratio with width', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box width={8} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '┌──────┐\n│X     │\n│      │\n└──────┘\nY');
});

test('set aspect ratio with height', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box height={3} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '┌────┐\n│X   │\n└────┘\nY');
});

test('set aspect ratio with width and height', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box width={8} height={3} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '┌────┐\n│X   │\n└────┘\nY');
});

test('set aspect ratio with maxHeight constraint', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box width={10} maxHeight={3} aspectRatio={2} borderStyle="single">
				<Text>X</Text>
			</Box>
			<Text>Y</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '┌────┐\n│X   │\n└────┘\nY');
});

test('clears aspectRatio on rerender', (t: TestContext) => {
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

	t.assert.strictEqual(
		stdout.write.lastCall.args[0],
		'┌──────┐\n│X     │\n│      │\n└──────┘\nY',
	);

	rerender(<Test aspectRatio={undefined} />);
	t.assert.strictEqual(
		stdout.write.lastCall.args[0],
		'┌──────┐\n│X     │\n└──────┘\nY',
	);
});

// TODO: Use `{expectFailure: '…'}` instead of `skip` when we target Node.js 24.
test(
	'set max width in percent',
	// eslint-disable-next-line node-test/no-skip-test -- Known failure. Node.js 22 does not support `expectFailure`.
	{skip: 'Yoga does not support percentage max width'},
	(t: TestContext) => {
		const output = renderToString(
			<Box width={10}>
				{/* @ts-expect-error Unsupported until Yoga fixes percentage width constraints. */}
				<Box maxWidth="50%">
					<Text>AAAAAAAAAA</Text>
				</Box>
				<Text>B</Text>
			</Box>,
		);

		t.assert.strictEqual(output, 'AAAAAB');
	},
);

test('set max height in percent', (t: TestContext) => {
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

	t.assert.strictEqual(output, 'A\n\n\nB\n\n');
});

// Concurrent mode tests
test('set width - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box>
			<Box width={5}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A    B');
});

test('set height - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'AB\n\n\n');
});
