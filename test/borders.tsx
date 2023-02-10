import React, {useState, useEffect} from 'react';
import test from 'ava';
import boxen, {type Options} from 'boxen';
import indentString from 'indent-string';
import delay from 'delay';
import {render, Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

test('single node - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, boxen('Hello World', {width: 100, borderStyle: 'round'}));
});

test('single node - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(
		output,
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green'
		})
	);
});

test('single node - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, boxen('Hello World', {borderStyle: 'round'}));
});

test('single node - fit-content box with wide characters', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>こんにちは</Text>
		</Box>
	);

	t.is(output, boxen('こんにちは', {borderStyle: 'round'}));
});

test('single node - fit-content box with emojis', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>🌊🌊</Text>
		</Box>
	);

	t.is(output, boxen('🌊🌊', {borderStyle: 'round'}));
});

test('single node - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, boxen('Hello World'.padEnd(18, ' '), {borderStyle: 'round'}));
});

test('single node - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>Hello World</Text>
		</Box>
	);

	t.is(
		output,
		boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
			borderStyle: 'round'
		})
	);
});

test('single node - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, boxen('\n Hello World \n', {borderStyle: 'round'}));
});

test('single node - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, boxen('   Hello World    ', {borderStyle: 'round'}));
});

test('single node - box with vertical alignment', t => {
	const output = renderToString(
		<Box
			borderStyle="round"
			height={20}
			alignItems="center"
			alignSelf="flex-start"
		>
			<Text>Hello World</Text>
		</Box>
	);

	t.is(
		output,
		boxen('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9), {
			borderStyle: 'round'
		})
	);
});

test('single node - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, boxen('Hello   \nWorld', {borderStyle: 'round'}));
});

test('multiple nodes - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, boxen('Hello World', {width: 100, borderStyle: 'round'}));
});

test('multiple nodes - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(
		output,
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green'
		})
	);
});

test('multiple nodes - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, boxen('Hello World', {borderStyle: 'round'}));
});

test('multiple nodes - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.is(output, boxen('Hello World'.padEnd(18, ' '), {borderStyle: 'round'}));
});

test('multiple nodes - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.is(
		output,
		boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
			borderStyle: 'round'
		})
	);
});

test('multiple nodes - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, boxen('\n Hello World \n', {borderStyle: 'round'}));
});

test('multiple nodes - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, boxen('   Hello World    ', {borderStyle: 'round'}));
});

test('multiple nodes - box with vertical alignment', t => {
	const output = renderToString(
		<Box
			borderStyle="round"
			height={20}
			alignItems="center"
			alignSelf="flex-start"
		>
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(
		output,
		boxen('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9), {
			borderStyle: 'round'
		})
	);
});

test('multiple nodes - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, boxen('Hello   \nWorld', {borderStyle: 'round'}));
});

test('multiple nodes - box with wrapping and long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Helloooooo'} World</Text>
		</Box>
	);

	t.is(output, boxen('Helloooo\noo World', {borderStyle: 'round'}));
});

test('multiple nodes - box with wrapping and very long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hellooooooooooooo'} World</Text>
		</Box>
	);

	t.is(output, boxen('Helloooo\noooooooo\no World', {borderStyle: 'round'}));
});

test('nested boxes', t => {
	const output = renderToString(
		<Box borderStyle="round" width={40} padding={1}>
			<Box borderStyle="round" justifyContent="center" padding={1}>
				<Text>Hello World</Text>
			</Box>
		</Box>
	);

	const nestedBox = indentString(
		boxen('\n Hello World \n', {borderStyle: 'round'}),
		1
	);

	t.is(
		output,
		boxen(`${' '.repeat(38)}\n${nestedBox}\n`, {borderStyle: 'round'})
	);
});

test('render border after update', async t => {
	const stdout = createStdout();

	function Test() {
		const [borderColor, setBorderColor] = useState<string | undefined>();

		useEffect(() => {
			setBorderColor('green');
		}, []);

		return (
			<Box borderStyle="round" borderColor={borderColor}>
				<Text>Hello World</Text>
			</Box>
		);
	}

	render(<Test />, {
		stdout,
		debug: true
	});

	t.is(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {width: 100, borderStyle: 'round'})
	);

	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green'
		})
	);
});
