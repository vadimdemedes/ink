import React from 'react';
import test from 'ava';
import boxes from 'cli-boxes';
import {Box, Line, Newline, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import boxen from 'boxen';

test('simple horizontal line', t => {
	const output = renderToString(<Line borderStyle="single" />);

	t.is(output, boxes.single.top.repeat(100));
});

test('horizontal line with margin', t => {
	const output = renderToString(
		<>
			<Text>Before</Text>
			<Line borderStyle="single" marginX={1} marginY={2} />
			<Text>After</Text>
		</>
	);

	t.is(output, 'Before\n\n\n ' + boxes.single.top.repeat(98) + '\n\n\nAfter');
});

test('horizontal line in a box', t => {
	const output = renderToString(
		<Box width={5} height={7} flexDirection="column" justifyContent="center">
			<Line orientation="horizontal" borderStyle="double" />
		</Box>
	);

	t.is(output, '\n\n\n' + boxes.double.top.repeat(5) + '\n\n\n');
});

test('vertical line in a box', t => {
	const output = renderToString(
		<Box width={5} height={20}>
			<Line orientation="vertical" borderStyle="double" />
		</Box>
	);

	t.is(output, (boxes.double.left + '\n').repeat(20).trimEnd());
});

test('flexbox layout 1', t => {
	const output = renderToString(
		<Box
			width={51}
			height={7}
			flexDirection="column"
			justifyContent="flex-start"
			borderStyle="double"
		>
			<Box flexDirection="row" justifyContent="flex-start">
				<Line orientation="vertical" borderStyle="single" />
				<Text>A</Text>
				<Line orientation="vertical" borderStyle="single" />
				<Text>B</Text>
				<Line orientation="vertical" borderStyle="single" />
			</Box>
		</Box>
	);

	const l = boxes.single.left;
	t.is(
		output,
		boxen(`${l}A${l}B${l}`, {
			borderStyle: 'double',
			height: 7,
			width: 51
		})
	);
});

test('flexbox layout 2', t => {
	const output = renderToString(
		<Box
			width={51}
			height={7}
			flexDirection="column"
			justifyContent="flex-start"
			borderStyle="double"
		>
			<Box flexDirection="row" justifyContent="flex-start">
				<Line orientation="vertical" borderStyle="single" />
				<Text>
					A<Newline />A
				</Text>
				<Line orientation="vertical" borderStyle="single" />
				<Text>
					B<Newline />B
				</Text>
				<Line orientation="vertical" borderStyle="single" />
			</Box>
		</Box>
	);

	const l = boxes.single.left;
	t.is(
		output,
		boxen(`${l}A${l}B${l}\n${l}A${l}B${l}`, {
			borderStyle: 'double',
			height: 7,
			width: 51
		})
	);
});

test('flexbox layout 3', t => {
	const output = renderToString(
		<Box
			width={51}
			height={7}
			flexDirection="column"
			justifyContent="flex-start"
			borderStyle="double"
		>
			<Box flexDirection="row" justifyContent="flex-start">
				<Line orientation="vertical" borderStyle="single" />
				<Line orientation="vertical" borderStyle="single" />
				<Line orientation="vertical" borderStyle="single" />
			</Box>
		</Box>
	);

	const l = boxes.single.left;
	t.is(
		output,
		boxen(`${l}${l}${l}`, {
			borderStyle: 'double',
			height: 7,
			width: 51
		})
	);
});
