import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, Transform, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {act} from './helpers/act.js';

// Tell React these updates are managed by act(), including concurrent commits.
// eslint-disable-next-line unicorn/no-global-object-property-assignment -- React reads this global flag.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

for (const isConcurrent of [false, true]) {
	for (const isNested of [false, true]) {
		test(`changing nested transform wrap points updates layout (concurrent: ${isConcurrent}, deeply nested: ${isNested})`, async (t: TestContext) => {
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
						<Text>{isNested ? <Text>{content}</Text> : content}</Text>
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
					concurrent: isConcurrent,
				});
			});
			t.after(async () => {
				await act(async () => {
					instance.unmount();
				});
			});
			t.assert.strictEqual(stdout.get(), 'ab\ncd\nef\n!');

			// Both strings have eight columns. Only the word boundaries change.
			await act(async () => {
				instance.rerender(<Example replaceSpaces />);
			});
			t.assert.strictEqual(stdout.get(), 'abxc\ndxef\n!');

			await act(async () => {
				instance.rerender(<Example replaceSpaces={false} />);
			});
			t.assert.strictEqual(stdout.get(), 'ab\ncd\nef\n!');
		});
	}
}
