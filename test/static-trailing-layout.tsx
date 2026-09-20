import React from 'react';
import test from 'ava';
import {Box, Text, Static, renderToString} from '../src/index.js';

for (const height of [0, 1, 2]) {
	test(`renderToString preserves ${height} trailing dynamic rows after Static`, t => {
		const output = renderToString(
			<>
				<Static items={['A']}>{item => <Text key={item}>{item}</Text>}</Static>
				<Box height={height} />
			</>,
		);

		t.is(output, `A${'\n'.repeat(height)}`);
	});
}

for (const staticText of ['', 'A', 'A\nB']) {
	test(`blank dynamic rows agree with ordinary layout after Static ${JSON.stringify(staticText)}`, t => {
		const output = renderToString(
			<>
				<Static items={['item']}>
					{item => <Text key={item}>{staticText}</Text>}
				</Static>
				<Box height={1} />
			</>,
		);
		const expected = renderToString(
			<Box flexDirection="column">
				<Text>{staticText}</Text>
				<Box height={1} />
			</Box>,
		);

		t.is(output, expected);
	});
}

test('hidden dynamic content does not add a separator to Static output', t => {
	const output = renderToString(
		<>
			<Static items={['A']}>{item => <Text key={item}>{item}</Text>}</Static>
			<Box display="none" height={1}>
				<Text>Hidden</Text>
			</Box>
		</>,
	);

	t.is(output, 'A');
});
