import React from 'react';
import test from 'ava';
import {Box, Text, Static, renderToString} from '../src/index.js';

for (const height of [0, 1, 2, 3]) {
	test(`Static preserves ${height} blank rows before dynamic output`, t => {
		const output = renderToString(
			<>
				<Static items={['blank']}>
					{item => <Box key={item} height={height} />}
				</Static>
				<Text>after</Text>
			</>,
		);
		const expected = renderToString(
			<Box flexDirection="column">
				<Box height={height} />
				<Text>after</Text>
			</Box>,
		);

		t.is(expected, '\n'.repeat(height) + 'after');
		t.is(output, expected);
	});
}

for (const content of [undefined, '', ' ', '\n']) {
	test(`Static preserves whitespace content ${JSON.stringify(content)}`, t => {
		const item = <Text>{content}</Text>;
		const output = renderToString(
			<>
				<Static items={['item']}>{key => <Box key={key}>{item}</Box>}</Static>
				<Text>after</Text>
			</>,
		);
		const expected = renderToString(
			<Box flexDirection="column">
				{item}
				<Text>after</Text>
			</Box>,
		);

		t.is(output, expected);
	});
}

test('empty Static does not insert a blank row', t => {
	const output = renderToString(
		<>
			<Static items={[]}>{item => <Text key={item}>{item}</Text>}</Static>
			<Text>after</Text>
		</>,
	);

	t.is(output, 'after');
});
