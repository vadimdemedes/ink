import test, {type TestContext} from 'node:test';
import React from 'react';
import boxen from 'boxen';
import indentString from 'indent-string';
import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import {render, Box, Text} from '../src/index.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';
import {renderAsync} from './helpers/test-renderer.js';

test('single node - full width box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello World', {width: 100, borderStyle: 'round'}),
	);
});

test('single node - full width box with colorful border', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green',
		}),
	);
});

test('single node - fit-content box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, boxen('Hello World', {borderStyle: 'round'}));
});

test('single node - fit-content box with wide characters', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>こんにちは</Text>
		</Box>,
	);

	t.assert.strictEqual(output, boxen('こんにちは', {borderStyle: 'round'}));
});

test('single node - fit-content box with emojis', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>🌊🌊</Text>
		</Box>,
	);

	t.assert.strictEqual(output, boxen('🌊🌊', {borderStyle: 'round'}));
});

// Issue #733: Emojis with variation selectors (FE0F) should align properly
test('single node - fit-content box with variation selector emojis', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>🌡️⚠️✅</Text>
		</Box>,
	);

	t.assert.strictEqual(output, boxen('🌡️⚠️✅', {borderStyle: 'round'}));
});

test('single node - fixed width box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello World'.padEnd(18, ' '), {borderStyle: 'round'}),
	);
});

test('single node - fixed width and height box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
			borderStyle: 'round',
		}),
	);
});

test('single node - box with padding', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('\n Hello World \n', {borderStyle: 'round'}),
	);
});

test('single node - box with horizontal alignment', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('   Hello World    ', {borderStyle: 'round'}),
	);
});

test('single node - box with vertical alignment', (t: TestContext) => {
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

	t.assert.strictEqual(
		output,
		boxen('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9), {
			borderStyle: 'round',
		}),
	);
});

test('single node - box with wrapping', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello   \nWorld', {borderStyle: 'round'}),
	);
});

test('multiple nodes - full width box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello World', {width: 100, borderStyle: 'round'}),
	);
});

test('multiple nodes - full width box with colorful border', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" borderColor="green">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green',
		}),
	);
});

test('multiple nodes - fit-content box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, boxen('Hello World', {borderStyle: 'round'}));
});

test('multiple nodes - fixed width box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={20}>
			<Text>{'Hello '}World</Text>
		</Box>,
	);
	t.assert.strictEqual(
		output,
		boxen('Hello World'.padEnd(18, ' '), {borderStyle: 'round'}),
	);
});

test('multiple nodes - fixed width and height box', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={20} height={20}>
			<Text>{'Hello '}World</Text>
		</Box>,
	);
	t.assert.strictEqual(
		output,
		boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
			borderStyle: 'round',
		}),
	);
});

test('multiple nodes - box with padding', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" padding={1} alignSelf="flex-start">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('\n Hello World \n', {borderStyle: 'round'}),
	);
});

test('multiple nodes - box with horizontal alignment', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={20} justifyContent="center">
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('   Hello World    ', {borderStyle: 'round'}),
	);
});

test('multiple nodes - box with vertical alignment', (t: TestContext) => {
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

	t.assert.strictEqual(
		output,
		boxen('\n'.repeat(8) + 'Hello World' + '\n'.repeat(9), {
			borderStyle: 'round',
		}),
	);
});

test('multiple nodes - box with wrapping', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			<Text>{'Hello '}World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello   \nWorld', {borderStyle: 'round'}),
	);
});

test('multiple nodes - box with wrapping and long first node', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			{/* eslint-disable-next-line @stylistic/jsx-curly-brace-presence -- The string expression and the text after it are separate text nodes, which is what this test checks. */}
			<Text>{'Helloooooo'} World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Helloooo\noo World', {borderStyle: 'round'}),
	);
});

test('multiple nodes - box with wrapping and very long first node', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="round" width={10}>
			{/* eslint-disable-next-line @stylistic/jsx-curly-brace-presence -- The string expression and the text after it are separate text nodes, which is what this test checks. */}
			<Text>{'Hellooooooooooooo'} World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Helloooo\noooooooo\no World', {borderStyle: 'round'}),
	);
});

test('nested boxes', (t: TestContext) => {
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

	t.assert.strictEqual(
		output,
		boxen(`${' '.repeat(38)}\n${nestedBox}\n`, {borderStyle: 'round'}),
	);
});

test('nested boxes - fit-content box with wide characters on flex-direction row', (t: TestContext) => {
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

	t.assert.strictEqual(output, expected);
});

test('nested boxes - fit-content box with emojis on flex-direction row', (t: TestContext) => {
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

	t.assert.strictEqual(output, expected);
});

test('nested boxes - fit-content box with wide characters on flex-direction column', (t: TestContext) => {
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

	t.assert.strictEqual(output, expected);
});

test('nested boxes - fit-content box with emojis on flex-direction column', (t: TestContext) => {
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

	t.assert.strictEqual(output, expected);
});

test('render border after update', (t: TestContext) => {
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

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {width: 100, borderStyle: 'round'}),
	);

	rerender(<Test borderColor="green" />);

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green',
		}),
	);

	rerender(<Test />);

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
		}),
	);
});

test('render border edge changes after update when borderStyle is unchanged', (t: TestContext) => {
	const stdout = createStdout();

	function Test({borderTop}: {readonly borderTop?: boolean}) {
		return (
			<Box borderStyle="round" borderTop={borderTop} alignSelf="flex-start">
				<Text>Content</Text>
			</Box>
		);
	}

	const {rerender} = render(<Test />, {
		stdout,
		debug: true,
	});

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		boxen('Content', {borderStyle: 'round'}),
	);

	rerender(<Test borderTop={false} />);

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		[
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
				cliBoxes.round.bottomRight
			}`,
		].join('\n'),
	);

	rerender(<Test />);

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		boxen('Content', {borderStyle: 'round'}),
	);
});

test('hide top border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderTop={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('hide bottom border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderBottom={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('hide top and bottom borders', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderTop={false} borderBottom={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		[
			'Above',
			`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
			'Below',
		].join('\n'),
	);
});

test('hide left border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderLeft={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('hide right border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderRight={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('hide left and right border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderLeft={false} borderRight={false}>
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('hide all borders', (t: TestContext) => {
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

	t.assert.strictEqual(output, ['Above', 'Content', 'Below'].join('\n'));
});

test('change color of top border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderTopColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('change color of bottom border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderBottomColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('change color of left border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderLeftColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('change color of right border', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderStyle="round" borderRightColor="green">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('custom border style', (t: TestContext) => {
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

	t.assert.strictEqual(
		output,
		boxen('Content', {width: 100, borderStyle: 'arrow'}),
	);
});

test('dim border color', (t: TestContext) => {
	const output = renderToString(
		<Box borderDimColor borderStyle="round">
			<Text>Content</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Content', {
			width: 100,
			borderStyle: 'round',
			dimBorder: true,
		}),
	);
});

test('dim top border color', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderTopDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('dim bottom border color', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderBottomDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('dim left border color', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderLeftDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

test('dim right border color', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" alignItems="flex-start">
			<Text>Above</Text>
			<Box borderRightDimColor borderStyle="round">
				<Text>Content</Text>
			</Box>
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(
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

// Regression test for https://github.com/vadimdemedes/ink/issues/840
// borderDimColor should not dim styled child Text components touching the left edge
test('borderDimColor does not dim styled child Text touching left edge', (t: TestContext) => {
	const output = renderToString(
		<Box borderDimColor borderStyle="round" alignSelf="flex-start">
			<Text bold color="blue">
				styled text
			</Text>
		</Box>,
	);

	// The styled text should be bold and blue (not dimmed)
	// Note: Text component applies color first then bold, so the escape code order is bold+blue
	const styledText = chalk.bold(chalk.blue('styled text'));
	t.assert.ok(
		output.includes(styledText),
		'Child text should retain its color and bold styling, not be dimmed',
	);

	// The border should be dimmed (entire top border line is dimmed as a unit)
	const dimmedTopBorder = chalk.dim(
		cliBoxes.round.topLeft +
			cliBoxes.round.top.repeat(11) +
			cliBoxes.round.topRight,
	);
	t.assert.ok(output.includes(dimmedTopBorder), 'Border should be dimmed');
});

// Concurrent mode tests
test('single node - full width box - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box borderStyle="round">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Hello World', {width: 100, borderStyle: 'round'}),
	);
});

test('single node - fit-content box - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box borderStyle="round" alignSelf="flex-start">
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, boxen('Hello World', {borderStyle: 'round'}));
});

test('nested boxes - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
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

	t.assert.strictEqual(
		output,
		boxen(`${' '.repeat(38)}\n${nestedBox}\n`, {borderStyle: 'round'}),
	);
});

test('render border after update - concurrent', async (t: TestContext) => {
	function Test({borderColor}: {readonly borderColor?: string}) {
		return (
			<Box borderStyle="round" borderColor={borderColor}>
				<Text>Hello World</Text>
			</Box>
		);
	}

	const {getOutput, rerenderAsync} = await renderAsync(<Test />);

	t.assert.strictEqual(
		getOutput(),
		boxen('Hello World', {width: 100, borderStyle: 'round'}),
	);

	await rerenderAsync(<Test borderColor="green" />);

	t.assert.strictEqual(
		getOutput(),
		boxen('Hello World', {
			width: 100,
			borderStyle: 'round',
			borderColor: 'green',
		}),
	);
});
