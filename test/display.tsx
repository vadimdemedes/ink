import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';

test('display flex', (t: TestContext) => {
	const output = renderToString(
		<Box display="flex">
			<Text>X</Text>
		</Box>,
	);
	t.assert.strictEqual(output, 'X');
});

test('display none', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box display="none">
				<Text>Kitty!</Text>
			</Box>
			<Text>Doggo</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Doggo');
});

for (const initialDisplay of ['none', 'flex'] as const) {
	test(`removing display="${initialDisplay}" restores the default layout`, (t: TestContext) => {
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
		const {rerender, unmount} = render(<Example display={initialDisplay} />, {
			stdout,
			debug: true,
		});
		t.after(() => {
			unmount();
		});

		t.assert.strictEqual(
			stdout.get(),
			initialDisplay === 'none' ? 'Dog' : 'CatDog',
		);
		rerender(<Example />);
		t.assert.strictEqual(stdout.get(), 'CatDog');
	});
}

// Concurrent mode tests
test('display flex - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box display="flex">
			<Text>X</Text>
		</Box>,
	);
	t.assert.strictEqual(output, 'X');
});

test('display none - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box flexDirection="column">
			<Box display="none">
				<Text>Kitty!</Text>
			</Box>
			<Text>Doggo</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Doggo');
});
