import React, {useState, useEffect} from 'react';
import test from 'ava';
import boxen, {Options} from 'boxen';
import indentString from 'indent-string';
import delay from 'delay';
import {renderToString} from './helpers/render-to-string';
import createStdout from './helpers/create-stdout';
import {render, Box, Text} from '../src';

const box = (text: string, options?: Options): string => {
	return boxen(text, {
		...options,
		borderStyle: 'round'
	});
};

test('single node - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, box('Hello World'.padEnd(98, ' ')));
});

test('single node - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, box('Hello World'.padEnd(98, ' '), {borderColor: 'green'}));
});

test('single node - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, box('Hello World'));
});

test('single node - fit-content box with wide characters', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>こんにちは</Text>
		</Box>
	);

	t.is(output, box('こんにちは'));
});

test('single node - fit-content box with emojis', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>🌊🌊</Text>
		</Box>
	);

	t.is(output, box('🌊🌊'));
});

test('single node - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>Hello World</Text>
		</Box>
	);
	t.is(output, box('Hello World'.padEnd(18, ' ')));
});

test('single node - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>Hello World</Text>
		</Box>
	);
	t.is(output, box('Hello World'.padEnd(18, ' ') + '\n'.repeat(17)));
});

test('single node - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);
	t.is(output, box('\n Hello World \n'));
});

test('single node - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>Hello World</Text>
		</Box>
	);
	t.is(output, box('   Hello World    '));
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

	t.is(output, box('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9)));
});

test('single node - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>Hello World</Text>
		</Box>
	);

	t.is(output, box('Hello   \nWorld'));
});

test('multiple nodes - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, box('Hello World'.padEnd(98, ' ')));
});

test('multiple nodes - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, box('Hello World'.padEnd(98, ' '), {borderColor: 'green'}));
});

test('multiple nodes - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, box('Hello World'));
});

test('multiple nodes - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.is(output, box('Hello World'.padEnd(18, ' ')));
});

test('multiple nodes - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.is(output, box('Hello World'.padEnd(18, ' ') + '\n'.repeat(17)));
});

test('multiple nodes - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.is(output, box('\n Hello World \n'));
});

test('multiple nodes - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.is(output, box('   Hello World    '));
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

	t.is(output, box('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9)));
});

test('multiple nodes - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.is(output, box('Hello   \nWorld'));
});

test('multiple nodes - box with wrapping and long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Helloooooo'} World</Text>
		</Box>
	);

	t.is(output, box('Helloooo\noo World'));
});

test('multiple nodes - box with wrapping and very long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hellooooooooooooo'} World</Text>
		</Box>
	);

	t.is(output, box('Helloooo\noooooooo\no World'));
});

test('nested boxes', t => {
	const output = renderToString(
		<Box borderStyle="round" width={40} padding={1}>
			<Box borderStyle="round" justifyContent="center" padding={1}>
				<Text>Hello World</Text>
			</Box>
		</Box>
	);

	const nestedBox = indentString(box('\n Hello World \n'), 1);
	t.is(output, box(`${' '.repeat(38)}\n${nestedBox}\n`));
});

test('render border after update', async t => {
	const stdout = createStdout();

	const Test = () => {
		const [borderColor, setBorderColor] = useState();

		useEffect(() => {
			setBorderColor('green');
		}, []);

		return (
			<Box borderStyle="round" borderColor={borderColor}>
				<Text>Hello World</Text>
			</Box>
		);
	};

	render(<Test />, {
		stdout,
		debug: true
	});

	t.is(stdout.write.lastCall.args[0], box('Hello World'.padEnd(98, ' ')));
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		box('Hello World'.padEnd(98, ' '), {borderColor: 'green'})
	);
});
