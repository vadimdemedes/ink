import React from 'react';
import test from 'ava';
import {Box, Text, render} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

const renderWithAlignContent = (
	alignContent: NonNullable<React.ComponentProps<typeof Box>['alignContent']>,
): string =>
	renderToString(
		<Box width={2} height={6} flexWrap="wrap" alignContent={alignContent}>
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
			<Text>D</Text>
		</Box>,
	);

for (const [alignContent, expectedOutput] of [
	['flex-start', 'AB\nCD\n\n\n\n'],
	['center', '\n\nAB\nCD\n\n'],
	['flex-end', '\n\n\n\nAB\nCD'],
	['space-between', 'AB\n\n\n\n\nCD'],
	['space-around', '\nAB\n\n\nCD\n'],
	['space-evenly', '\nAB\n\nCD\n\n'],
	['stretch', 'AB\n\n\nCD\n\n'],
] as const) {
	test(`align content ${alignContent}`, t => {
		const output = renderWithAlignContent(alignContent);
		t.is(output, expectedOutput);
	});
}

test('align content defaults to flex-start', t => {
	const output = renderToString(
		<Box width={2} height={6} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
			<Text>D</Text>
		</Box>,
	);

	t.is(output, 'AB\nCD\n\n\n\n');
});

test('align content does not add extra spacing when there is no free cross-axis space', t => {
	const output = renderToString(
		<Box width={2} height={2} flexWrap="wrap" alignContent="center">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
			<Text>D</Text>
		</Box>,
	);

	t.is(output, 'AB\nCD');
});

test('clears alignContent on rerender to default flex-start', t => {
	const stdout = createStdout();

	function Test({
		alignContent,
	}: {
		readonly alignContent?: React.ComponentProps<typeof Box>['alignContent'];
	}) {
		return (
			<Box width={2} height={6} flexWrap="wrap" alignContent={alignContent}>
				<Text>A</Text>
				<Text>B</Text>
				<Text>C</Text>
				<Text>D</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test alignContent="center" />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], '\n\nAB\nCD\n\n');

	rerender(<Test alignContent={undefined} />);
	t.is(stdout.write.lastCall.args[0], 'AB\nCD\n\n\n\n');
});

test('clears alignContent from stretch on rerender to default flex-start', t => {
	const stdout = createStdout();

	function Test({
		alignContent,
	}: {
		readonly alignContent?: React.ComponentProps<typeof Box>['alignContent'];
	}) {
		return (
			<Box width={2} height={6} flexWrap="wrap" alignContent={alignContent}>
				<Text>A</Text>
				<Text>B</Text>
				<Text>C</Text>
				<Text>D</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test alignContent="stretch" />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], 'AB\n\n\nCD\n\n');

	rerender(<Test alignContent={undefined} />);
	t.is(stdout.write.lastCall.args[0], 'AB\nCD\n\n\n\n');
});

test('clears alignContent when prop is omitted on rerender', t => {
	const stdout = createStdout();

	function Test({showAlignContent}: {readonly showAlignContent: boolean}) {
		return (
			<Box
				width={2}
				height={6}
				flexWrap="wrap"
				{...(showAlignContent ? {alignContent: 'center' as const} : {})}
			>
				<Text>A</Text>
				<Text>B</Text>
				<Text>C</Text>
				<Text>D</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test showAlignContent />, {
		stdout,
		debug: true,
	});

	t.is(stdout.write.lastCall.args[0], '\n\nAB\nCD\n\n');

	rerender(<Test showAlignContent={false} />);
	t.is(stdout.write.lastCall.args[0], 'AB\nCD\n\n\n\n');
});

test('align content center - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box width={2} height={6} flexWrap="wrap" alignContent="center">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
			<Text>D</Text>
		</Box>,
	);

	t.is(output, '\n\nAB\nCD\n\n');
});
