import React from 'react';
import test from 'ava';
import boxen from 'boxen';
import indentString from 'indent-string';
import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import {render, Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

test('single node - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, boxen('Hello World', {width: 100, borderStyle: 'round'}));
});

test('single node - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(
		output,
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green',
		}),
	);
});

test('single node - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, boxen('Hello World', {borderStyle: 'round'}));
});

test('single node - fit-content box with wide characters', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>こんにちは</Text>
		</Box>,
	);

	t.is(output, boxen('こんにちは', {borderStyle: 'round'}));
});

test('single node - fit-content box with emojis', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>🌊🌊</Text>
		</Box>,
	);

	t.is(output, boxen('🌊🌊', {borderStyle: 'round'}));
});

test('single node - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, boxen('Hello World'.padEnd(18, ' '), {borderStyle: 'round'}));
});

test('single node - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(
		output,
		boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
			borderStyle: 'round',
		}),
	);
});

test('single node - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, boxen('\n Hello World \n', {borderStyle: 'round'}));
});

test('single node - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>Hello World</Text>
		</Box>,
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
		</Box>,
	);

	t.is(
		output,
		boxen('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9), {
			borderStyle: 'round',
		}),
	);
});

test('single node - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.is(output, boxen('Hello   \nWorld', {borderStyle: 'round'}));
});

test('multiple nodes - full width box', t => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.is(output, boxen('Hello World', {width: 100, borderStyle: 'round'}));
});

test('multiple nodes - full width box with colorful border', t => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.is(
		output,
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green',
		}),
	);
});

test('multiple nodes - fit-content box', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.is(output, boxen('Hello World', {borderStyle: 'round'}));
});

test('multiple nodes - fixed width box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>{'Hello '}World</Text>
		</Box>,
	);
	t.is(output, boxen('Hello World'.padEnd(18, ' '), {borderStyle: 'round'}));
});

test('multiple nodes - fixed width and height box', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>{'Hello '}World</Text>
		</Box>,
	);
	t.is(
		output,
		boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
			borderStyle: 'round',
		}),
	);
});

test('multiple nodes - box with padding', t => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.is(output, boxen('\n Hello World \n', {borderStyle: 'round'}));
});

test('multiple nodes - box with horizontal alignment', t => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>{'Hello '}World</Text>
		</Box>,
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
		</Box>,
	);

	t.is(
		output,
		boxen('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9), {
			borderStyle: 'round',
		}),
	);
});

test('multiple nodes - box with wrapping', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.is(output, boxen('Hello   \nWorld', {borderStyle: 'round'}));
});

test('multiple nodes - box with wrapping and long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Helloooooo'} World</Text>
		</Box>,
	);

	t.is(output, boxen('Helloooo\noo World', {borderStyle: 'round'}));
});

test('multiple nodes - box with wrapping and very long first node', t => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hellooooooooooooo'} World</Text>
		</Box>,
	);

	t.is(output, boxen('Helloooo\noooooooo\no World', {borderStyle: 'round'}));
});

test('nested boxes', t => {
	const output = renderToString(
		<Box borderStyle="round" width={40} padding={1}>
			<Box borderStyle="round" justifyContent="center" padding={1}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	const nestedBox = indentString(
		boxen('\n Hello World \n', {borderStyle: 'round'}),
		1,
	);

	t.is(
		output,
		boxen(`${' '.repeat(38)}\n${nestedBox}\n`, {borderStyle: 'round'}),
	);
});

test('nested boxes - fit-content box with wide characters on flex-direction row', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Box borderStyle="round">
				<Text>ミスター</Text>
			</Box>
			<Box borderStyle="round">
				<Text>スポック</Text>
			</Box>
			<Box borderStyle="round">
				<Text>カーク船長</Text>
			</Box>
		</Box>,
	);

	const box1 = boxen('ミスター', {borderStyle: 'round'});
	const box2 = boxen('スポック', {borderStyle: 'round'});
	const box3 = boxen('カーク船長', {borderStyle: 'round'});

	const expected = boxen(
		box1
			.split('\n')
			.map(
				(line, index) =>
					line + box2.split('\n')[index]! + box3.split('\n')[index]!,
			)
			.join('\n'),
		{borderStyle: 'round'},
	);

	t.is(output, expected);
});

test('nested boxes - fit-content box with emojis on flex-direction row', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Box borderStyle="round">
				<Text>🦾</Text>
			</Box>
			<Box borderStyle="round">
				<Text>🌏</Text>
			</Box>
			<Box borderStyle="round">
				<Text>😋</Text>
			</Box>
		</Box>,
	);

	const box1 = boxen('🦾', {borderStyle: 'round'});
	const box2 = boxen('🌏', {borderStyle: 'round'});
	const box3 = boxen('😋', {borderStyle: 'round'});

	const expected = boxen(
		box1
			.split('\n')
			.map(
				(line, index) =>
					line + box2.split('\n')[index]! + box3.split('\n')[index]!,
			)
			.join('\n'),
		{borderStyle: 'round'},
	);

	t.is(output, expected);
});

test('nested boxes - fit-content box with wide characters on flex-direction column', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start" flexDirection="column">
			<Box borderStyle="round">
				<Text>ミスター</Text>
			</Box>
			<Box borderStyle="round">
				<Text>スポック</Text>
			</Box>
			<Box borderStyle="round">
				<Text>カーク船長</Text>
			</Box>
		</Box>,
	);

	const expected = boxen(
		boxen('ミスター  ', {borderStyle: 'round'}) +
			'\n' +
			boxen('スポック  ', {borderStyle: 'round'}) +
			'\n' +
			boxen('カーク船長', {borderStyle: 'round'}),
		{borderStyle: 'round'},
	);

	t.is(output, expected);
});

test('nested boxes - fit-content box with emojis on flex-direction column', t => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start" flexDirection="column">
			<Box borderStyle="round">
				<Text>🦾</Text>
			</Box>
			<Box borderStyle="round">
				<Text>🌏</Text>
			</Box>
			<Box borderStyle="round">
				<Text>😋</Text>
			</Box>
		</Box>,
	);

	const expected = boxen(
		boxen('🦾', {borderStyle: 'round'}) +
			'\n' +
			boxen('🌏', {borderStyle: 'round'}) +
			'\n' +
			boxen('😋', {borderStyle: 'round'}),
		{borderStyle: 'round'},
	);

	t.is(output, expected);
});

test('render border after update', t => {
	const stdout = createStdout();

	function Test({borderColor}: {readonly borderColor?: string}) {
		return (
			<Box borderStyle="round" borderColor={borderColor}>
				<Text>Hello World</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test />, {
		stdout,
		debug: true,
	});

	t.is(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {width: 100, borderStyle: 'round'}),
	);

	rerender(<Test borderColor="green" />);

	t.is(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green',
		}),
	);

	rerender(<Test />);

	t.is(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
		}),
	);
});

test('hide top border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderTop={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
			'Below',
		].join('\n'),
	);
});

test('hide bottom border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderBottom={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
				cliBoxes.round.topRight
			}`,
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			'Below',
		].join('\n'),
	);
});

test('hide top and bottom borders', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderTop={false} borderBottom={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			'Below',
		].join('\n'),
	);
});

test('hide left border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderLeft={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
			`Content${cliBoxes.round.right}`,
			`${cliBoxes.round.bottom.repeat(7)}${cliBoxes.round.bottomRight}`,
			'Below',
		].join('\n'),
	);
});

test('hide right border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderRight={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}`,
			`${cliBoxes.round.left}Content`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}`,
			'Below',
		].join('\n'),
	);
});

test('hide left and right border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderLeft={false} borderRight={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			cliBoxes.round.top.repeat(7),
			'Content',
			cliBoxes.round.bottom.repeat(7),
			'Below',
		].join('\n'),
	);
});

test('hide all borders', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box
				borderStyle="round"
				borderTop={false}
				borderBottom={false}
				borderLeft={false}
				borderRight={false}
			>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(output, ['Above', 'Content', 'Below'].join('\n'));
});

test('change color of top border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderTopColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			chalk.green(
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
			),
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
			'Below',
		].join('\n'),
	);
});

test('change color of bottom border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderBottomColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
				cliBoxes.round.topRight
			}`,
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			chalk.green(
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
			),
			'Below',
		].join('\n'),
	);
});

test('change color of left border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderLeftColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
				cliBoxes.round.topRight
			}`,
			`${chalk.green(cliBoxes.round.left)}Content${cliBoxes.round.right}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
			'Below',
		].join('\n'),
	);
});

test('change color of right border', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderRightColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
				cliBoxes.round.topRight
			}`,
			`${cliBoxes.round.left}Content${chalk.green(cliBoxes.round.right)}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
			'Below',
		].join('\n'),
	);
});

test('custom border style', t => {
	const output = renderToString(
		<Box
			borderStyle={{
				topLeft: '↘',
				top: '↓',
				topRight: '↙',
				left: '→',
				bottomLeft: '↗',
				bottom: '↑',
				bottomRight: '↖',
				right: '←',
			}}
		>
			<Text>Content</Text>
		</Box>,
	);

	t.is(output, boxen('Content', {width: 100, borderStyle: 'arrow'}));
});

test('dim border color', t => {
	const output = renderToString(
		<Box borderDimColor borderStyle="round">
			<Text>Content</Text>
		</Box>,
	);

	t.is(
		output,
		boxen('Content', {
			width: 100,
			borderStyle: 'round',
			dimBorder: true,
		}),
	);
});

test('dim top border color', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderTopDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			chalk.dim(
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
			),
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
			'Below',
		].join('\n'),
	);
});

test('dim bottom border color', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderBottomDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
				cliBoxes.round.topRight
			}`,
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			chalk.dim(
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
			),
			'Below',
		].join('\n'),
	);
});

test('dim left border color', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderLeftDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
				cliBoxes.round.topRight
			}`,
			`${chalk.dim(cliBoxes.round.left)}Content${cliBoxes.round.right}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
			'Below',
		].join('\n'),
	);
});

test('dim right border color', t => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderRightDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.is(
		output,
		[
			'Above',
			`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
				cliBoxes.round.topRight
			}`,
			`${cliBoxes.round.left}Content${chalk.dim(cliBoxes.round.right)}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
			'Below',
		].join('\n'),
	);
});
