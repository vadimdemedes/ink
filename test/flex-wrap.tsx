import React from 'react';
import test from 'ava';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {renderToString} from './helpers/render-to-string.js';

test('row - no wrap', t => {
	const output = renderToString(
		<Box width={2}>
			<Text>A</Text>
			<Text>BC</Text>
		</Box>,
	);

	t.is(output, 'BC\n');
});

test('column - no wrap', t => {
	const output = renderToString(
		<Box flexDirection="column" height={2}>
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, 'B\nC');
});

test('row - wrap content', t => {
	const output = renderToString(
		<Box width={2} flexWrap="wrap">
			<Text>A</Text>
			<Text>BC</Text>
		</Box>,
	);

	t.is(output, 'A\nBC');
});

for (const [wrap, initialOutput] of [
	['wrap', 'AB\nCD'],
	['wrap-reverse', 'CD\nAB'],
] as const) {
	test(`setting ${wrap} to undefined restores nowrap`, t => {
		function Example({wrap}: {readonly wrap?: 'wrap' | 'wrap-reverse'}) {
			return (
				<Box width={3} flexWrap={wrap}>
					<Box flexShrink={0}>
						<Text>AB</Text>
					</Box>
					<Box flexShrink={0}>
						<Text>CD</Text>
					</Box>
				</Box>
			);
		}

		const stdout = createStdout();
		const {rerender, unmount} = render(<Example wrap={wrap} />, {
			stdout,
			debug: true,
		});
		t.teardown(unmount);

		t.is(stdout.get(), initialOutput);
		rerender(<Example />);
		t.is(stdout.get(), 'ABCD');
	});
}

test('column - wrap content', t => {
	const output = renderToString(
		<Box flexDirection="column" height={2} flexWrap="wrap">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, 'AC\nB');
});

test('column - wrap content reverse', t => {
	const output = renderToString(
		<Box flexDirection="column" height={2} width={3} flexWrap="wrap-reverse">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, ' CA\n  B');
});

test('row - wrap content reverse', t => {
	const output = renderToString(
		<Box height={3} width={2} flexWrap="wrap-reverse">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, '\nC\nAB');
});
