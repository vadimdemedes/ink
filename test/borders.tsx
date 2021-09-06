import React, {useState, useEffect} from 'react';
import test from 'ava';
import delay from 'delay';
import {renderToString} from './helpers/render-to-string';
import createStdout from './helpers/create-stdout';
import {render, Box, Text, Newline} from '../src';

test('single node - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>Hello World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('single node - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>Hello World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('single node - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('single node - fit-content box with wide characters', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>こんにちは</Text>
		</Box>
	);

	t.snapshot(output);
});

test('single node - fit-content box with emojis', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>🌊🌊</Text>
		</Box>
	);

	t.snapshot(output);
});

test('single node - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('single node - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('single node - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('single node - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
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

	t.snapshot(output);
});

test('single node - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>Hello World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('multiple nodes - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('multiple nodes - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('multiple nodes - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('multiple nodes - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('multiple nodes - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('multiple nodes - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('multiple nodes - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>{'Hello '}World</Text>
		</Box>
	);
	t.snapshot(output);
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

	t.snapshot(output);
});

test('multiple nodes - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hello '}World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('multiple nodes - box with wrapping and long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Helloooooo'} World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('multiple nodes - box with wrapping and very long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hellooooooooooooo'} World</Text>
		</Box>
	);

	t.snapshot(output);
});

test('nested boxes', t => {
	const output = renderToString(
		<Box borderStyle="round" width={40} padding={1}>
			<Box borderStyle="round" justifyContent="center" padding={1}>
				<Text>Hello World</Text>
			</Box>
		</Box>
	);

	t.snapshot(output);
});

test('custom borders - complete box', t => {
	const output = renderToString(
		<Box
			borderStyle={{
				top: '-',
				left: '|',
				bottom: '=',
				right: '║',
				topLeft: '´',
				topRight: '•',
				bottomLeft: '+',
				bottomRight: '/'
			}}
			alignSelf="flex-start"
		>
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('custom borders - only top', t => {
	const output = renderToString(
		<Box borderStyle={{top: '-'}} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('custom borders - only top with corners', t => {
	const output1char = renderToString(
		<Box
			borderStyle={{top: '─', topLeft: '╭', topRight: '╮'}}
			alignSelf="flex-start"
		>
			<Text>1</Text>
		</Box>
	);
	t.snapshot(output1char);

	const output2chars = renderToString(
		<Box
			borderStyle={{top: '─', topLeft: '╭', topRight: '╮'}}
			alignSelf="flex-start"
		>
			<Text>12</Text>
		</Box>
	);
	t.snapshot(output2chars);

	const output3chars = renderToString(
		<Box
			borderStyle={{top: '─', topLeft: '╭', topRight: '╮'}}
			alignSelf="flex-start"
		>
			<Text>123</Text>
		</Box>
	);
	t.snapshot(output3chars);
});

test('custom borders - only bottom', t => {
	const output = renderToString(
		<Box borderStyle={{bottom: '-'}} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('custom borders - only left', t => {
	const output = renderToString(
		<Box borderStyle={{left: '|'}} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('custom borders - only left with corners', t => {
	const output1Line = renderToString(
		<Box
			borderStyle={{left: '│', topLeft: '╭', bottomLeft: '╰'}}
			alignSelf="flex-start"
		>
			<Text>1</Text>
		</Box>
	);
	t.snapshot(output1Line);

	const output2Lines = renderToString(
		<Box
			borderStyle={{left: '│', topLeft: '╭', bottomLeft: '╰'}}
			alignSelf="flex-start"
		>
			<Text>
				1<Newline />2
			</Text>
		</Box>
	);
	t.snapshot(output2Lines);

	const output3Lines = renderToString(
		<Box
			borderStyle={{left: '│', topLeft: '╭', bottomLeft: '╰'}}
			alignSelf="flex-start"
		>
			<Text>
				1<Newline />2<Newline />3
			</Text>
		</Box>
	);
	t.snapshot(output3Lines);
});

test('custom borders - only right', t => {
	const output = renderToString(
		<Box borderStyle={{right: '|'}} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>
	);
	t.snapshot(output);
});

test('render border after update', async t => {
	const stdout = createStdout();

	const Test = () => {
		const [borderColor, setBorderColor] = useState<string | undefined>();

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

	t.snapshot(stdout.write.lastCall.args[0]);
	await delay(100);

	t.snapshot(stdout.write.lastCall.args[0]);
});
