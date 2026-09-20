import React, {act} from 'react';
import test from 'ava';
import {Box, Text, Transform, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

// Tell React these updates are managed by act(), including concurrent commits.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

for (const concurrent of [false, true]) {
	for (const nested of [false, true]) {
		test(`changing nested transform wrap points updates layout (concurrent: ${concurrent}, deeply nested: ${nested})`, async t => {
			function Example({replaceSpaces}: {readonly replaceSpaces: boolean}) {
				const content = (
					<Transform
						transform={text =>
							replaceSpaces ? text.replaceAll(' ', 'x') : text
						}
					>
						<Text>ab cd ef</Text>
					</Transform>
				);

				return (
					<Box flexDirection="column" width={4}>
						<Text>{nested ? <Text>{content}</Text> : content}</Text>
						<Text>!</Text>
					</Box>
				);
			}

			const stdout = createStdout();
			let instance!: ReturnType<typeof render>;
			await act(async () => {
				instance = render(<Example replaceSpaces={false} />, {
					stdout,
					debug: true,
					concurrent,
				});
			});
			t.teardown(async () => {
				await act(async () => {
					instance.unmount();
				});
			});
			t.is(stdout.get(), 'ab\ncd\nef\n!');

			// Both strings have eight columns. Only the word boundaries change.
			await act(async () => {
				instance.rerender(<Example replaceSpaces />);
			});
			t.is(stdout.get(), 'abxc\ndxef\n!');

			await act(async () => {
				instance.rerender(<Example replaceSpaces={false} />);
			});
			t.is(stdout.get(), 'ab\ncd\nef\n!');
		});
	}
}
