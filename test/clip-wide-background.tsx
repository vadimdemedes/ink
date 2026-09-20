import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import {Box, Text, renderToString} from '../src/index.js';

const originalColorLevel = chalk.level;
test.before(() => {
	chalk.level = 3;
});
test.after(() => {
	chalk.level = originalColorLevel;
});

for (const nested of [false, true]) {
	for (const [offset, width, expected] of [
		[1, 3, ' 好'],
		[0, 3, '你 '],
		[1, 2, '  '],
		[0, 4, '你好'],
	] as const) {
		test(`clipping wide text preserves its background (nested: ${nested}, offset: ${offset}, width: ${width})`, t => {
			const content = <Text backgroundColor="blue">你好</Text>;
			const output = renderToString(
				<Box
					width={width}
					height={1}
					overflowX="hidden"
					contentOffsetX={offset}
				>
					<Box width={4} flexShrink={0}>
						{nested ? <Text>{content}</Text> : content}
					</Box>
				</Box>,
			);

			t.is(output, chalk.bgBlue(expected));
		});
	}
}

test('clipped halves retain their own background colors', t => {
	const output = renderToString(
		<Box width={2} height={1} overflowX="hidden" contentOffsetX={1}>
			<Box width={4} flexShrink={0}>
				<Text>
					<Text backgroundColor="blue">你</Text>
					<Text backgroundColor="red">好</Text>
				</Text>
			</Box>
		</Box>,
	);

	const expected = renderToString(
		<Text>
			<Text backgroundColor="blue"> </Text>
			<Text backgroundColor="red"> </Text>
		</Text>,
	);
	t.is(output, expected);
});

test('clipping a joined emoji preserves its background and adjacent text', t => {
	const output = renderToString(
		<Box width={2} height={1} overflowX="hidden" contentOffsetX={1}>
			<Box width={3} flexShrink={0}>
				<Text>
					<Text backgroundColor="blue">👩‍💻X</Text>
				</Text>
			</Box>
		</Box>,
	);

	t.is(output, chalk.bgBlue(' X'));
});
