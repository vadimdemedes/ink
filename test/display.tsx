import React from 'react';
import test from 'ava';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('display flex', t => {
	const output = renderToString(
		<Box display="flex">
			<Text>X</Text>
		</Box>,
	);
	t.is(output, 'X');
});

test('display none', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box display="none">
				<Text>Kitty!</Text>
			</Box>
			<Text>Doggo</Text>
		</Box>,
	);

	t.is(output, 'Doggo');
});

for (const display of ['none', 'flex'] as const) {
	test(`removing display="${display}" restores the default layout`, t => {
		function Example({display}: {readonly display?: 'none' | 'flex'}) {
			return (
				<Box>
					<Box display={display}>
						<Text>Cat</Text>
					</Box>
					<Text>Dog</Text>
				</Box>
			);
		}

		const stdout = createStdout();
		const {rerender, unmount} = render(<Example display={display} />, {
			stdout,
			debug: true,
		});
		t.teardown(unmount);

		t.is(stdout.get(), display === 'none' ? 'Dog' : 'CatDog');
		rerender(<Example />);
		t.is(stdout.get(), 'CatDog');
	});
}

// Concurrent mode tests
test('display flex - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box display="flex">
			<Text>X</Text>
		</Box>,
	);
	t.is(output, 'X');
});

test('display none - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box flexDirection="column">
			<Box display="none">
				<Text>Kitty!</Text>
			</Box>
			<Text>Doggo</Text>
		</Box>,
	);

	t.is(output, 'Doggo');
});
