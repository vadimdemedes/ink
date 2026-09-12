import React from 'react';
import test from 'ava';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('direction row', t => {
	const output = renderToString(
		<Box flexDirection="row">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB');
});

test('undefined direction uses the default row layout', t => {
	const output = renderToString(
		<Box flexDirection={undefined}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB');
});

test('undefined direction uses row separators for screen readers', t => {
	const output = renderToString(
		<Box flexDirection={undefined}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{isScreenReaderEnabled: true},
	);

	t.is(output, 'A B');
});

test('setting direction to undefined restores the default row layout', t => {
	function Example({direction}: {readonly direction?: 'column'}) {
		return (
			<Box flexDirection={direction}>
				<Text>A</Text>
				<Text>B</Text>
			</Box>
		);
	}

	const stdout = createStdout();
	const {rerender, unmount} = render(<Example direction="column" />, {
		stdout,
		debug: true,
	});
	t.teardown(unmount);

	t.is(stdout.get(), 'A\nB');
	rerender(<Example />);
	t.is(stdout.get(), 'AB');
});

test('direction row reverse', t => {
	const output = renderToString(
		<Box flexDirection="row-reverse" width={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '  BA');
});

test('direction column', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\nB');
});

test('direction column reverse', t => {
	const output = renderToString(
		<Box flexDirection="column-reverse" height={4}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, '\n\nB\nA');
});

test('don’t squash text nodes when column direction is applied', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\nB');
});

// Concurrent mode tests
test('direction row - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box flexDirection="row">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'AB');
});

test('direction column - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A\nB');
});
