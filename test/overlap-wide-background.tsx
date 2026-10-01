import test, {before, after, type TestContext} from 'node:test';
import React from 'react';
import chalk from 'chalk';
import {Box, Text, renderToString} from '../src/index.js';

const originalColorLevel = chalk.level;
before(() => {
	chalk.level = 3;
});
after(() => {
	chalk.level = originalColorLevel;
});

for (const glyph of ['你', '👩‍💻']) {
	for (const left of [0, 1]) {
		test(`overwriting ${glyph} cell ${left} preserves the other cell's background`, (t: TestContext) => {
			const output = renderToString(
				<Box width={3} height={1}>
					<Text backgroundColor="blue">{glyph}Z</Text>
					<Box position="absolute" left={left} top={0}>
						<Text>X</Text>
					</Box>
				</Box>,
			);
			const expected = renderToString(
				<Text>
					{left === 0 ? (
						<>
							<Text>X</Text>
							<Text backgroundColor="blue"> Z</Text>
						</>
					) : (
						<>
							<Text backgroundColor="blue"> </Text>
							<Text>X</Text>
							<Text backgroundColor="blue">Z</Text>
						</>
					)}
				</Text>,
			);

			t.assert.strictEqual(output, expected);
		});
	}
}

for (const replacement of ['XY', '好']) {
	test(`fully overwriting a wide character with ${replacement} replaces its styles`, (t: TestContext) => {
		const output = renderToString(
			<Box width={3} height={1}>
				<Text backgroundColor="blue">你Z</Text>
				<Box position="absolute" left={0} top={0}>
					<Text backgroundColor="red">{replacement}</Text>
				</Box>
			</Box>,
		);
		const expected = renderToString(
			<Text>
				<Text backgroundColor="red">{replacement}</Text>
				<Text backgroundColor="blue">Z</Text>
			</Text>,
		);

		t.assert.strictEqual(output, expected);
	});
}

test('an overlay crossing two wide characters preserves both exposed backgrounds', (t: TestContext) => {
	const output = renderToString(
		<Box width={4} height={1}>
			<Text>
				<Text backgroundColor="blue">你</Text>
				<Text backgroundColor="green">好</Text>
			</Text>
			<Box position="absolute" left={1} top={0}>
				<Text backgroundColor="red">XY</Text>
			</Box>
		</Box>,
	);
	const expected = renderToString(
		<Text>
			<Text backgroundColor="blue"> </Text>
			<Text backgroundColor="red">XY</Text>
			<Text backgroundColor="green"> </Text>
		</Text>,
	);

	t.assert.strictEqual(output, expected);
});
