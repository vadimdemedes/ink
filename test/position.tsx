import React from 'react';
import test from 'ava';
import {Box, Text, render} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

test('absolute position with top and left offsets', t => {
	const output = renderToString(
		<Box width={5} height={3}>
			<Box position="absolute" top={1} left={2}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n  X\n');
});

test('absolute position with bottom and right offsets', t => {
	const output = renderToString(
		<Box width={6} height={4}>
			<Box position="absolute" bottom={1} right={1}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n\n    X\n');
});

test('absolute position with percentage offsets', t => {
	const output = renderToString(
		<Box width={6} height={4}>
			<Box position="absolute" top="50%" left="50%">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n\n   X\n');
});

test('absolute position with percentage bottom and right offsets', t => {
	const output = renderToString(
		<Box width={6} height={4}>
			<Box position="absolute" bottom="50%" right="50%">
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n  X\n\n');
});

test('relative position offsets visual position while keeping flow', t => {
	const output = renderToString(
		<Box width={5}>
			<Box position="relative" left={2}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, ' BA');
});

test('static position ignores offsets', t => {
	const output = renderToString(
		<Box width={5}>
			<Box position="static" left={2}>
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB');
});

test('static position ignores percentage offsets', t => {
	const output = renderToString(
		<Box width={5}>
			<Box position="static" left="50%">
				<Text>A</Text>
			</Box>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB');
});

test('clears top offset on rerender', t => {
	const stdout = createStdout();

	function Test({top}: {readonly top?: number}) {
		return (
			<Box width={5} height={3}>
				<Box position="absolute" top={top} left={2}>
					<Text>X</Text>
				</Box>
			</Box>
		);
	}

	const {rerender} = render(<Test top={1} />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], '\n  X\n');

	rerender(<Test top={undefined} />);
	t.is(stdout.write.lastCall.args[0], '  X\n\n');
});

test('clears percentage top and left offsets on rerender', t => {
	const stdout = createStdout();

	function Test({top, left}: {readonly top?: string; readonly left?: string}) {
		return (
			<Box width={6} height={4}>
				<Box position="absolute" top={top} left={left}>
					<Text>X</Text>
				</Box>
			</Box>
		);
	}

	const {rerender} = render(<Test top="50%" left="50%" />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], '\n\n   X\n');

	rerender(<Test top={undefined} left={undefined} />);
	t.is(stdout.write.lastCall.args[0], 'X\n\n\n');
});

test('clears percentage top and left offsets when props are omitted on rerender', t => {
	const stdout = createStdout();

	function Test({showOffsets}: {readonly showOffsets: boolean}) {
		return (
			<Box width={6} height={4}>
				<Box
					position="absolute"
					{...(showOffsets ? {top: '50%' as const, left: '50%' as const} : {})}
				>
					<Text>X</Text>
				</Box>
			</Box>
		);
	}

	const {rerender} = render(<Test showOffsets />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], '\n\n   X\n');

	rerender(<Test showOffsets={false} />);
	t.is(stdout.write.lastCall.args[0], 'X\n\n\n');
});

test('clears bottom and right offsets on rerender', t => {
	const stdout = createStdout();

	function Test({
		bottom,
		right,
	}: {
		readonly bottom?: number;
		readonly right?: number;
	}) {
		return (
			<Box width={6} height={4}>
				<Box position="absolute" bottom={bottom} right={right}>
					<Text>X</Text>
				</Box>
			</Box>
		);
	}

	const {rerender} = render(<Test bottom={1} right={1} />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], '\n\n    X\n');

	rerender(<Test bottom={undefined} right={undefined} />);
	t.is(stdout.write.lastCall.args[0], 'X\n\n\n');
});

test('absolute position with top and left offsets - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box width={5} height={3}>
			<Box position="absolute" top={1} left={2}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n  X\n');
});
