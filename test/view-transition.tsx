import test, {type TestContext} from 'node:test';
import React, {useState, startTransition, ViewTransition} from 'react';
import {render, Box, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {act} from './helpers/act.js';

const renderExample = async (
	t: TestContext,
	node: React.ReactNode,
	isConcurrent: boolean,
) => {
	const stdout = createStdout();
	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(node, {
			stdout,
			debug: true,
			concurrent: isConcurrent,
			patchConsole: false,
			isScreenReaderEnabled: false,
		});
	});
	t.after(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	return stdout;
};

for (const isConcurrent of [false, true]) {
	const mode = isConcurrent ? 'concurrent' : 'legacy';

	test(`<ViewTransition> with a ref renders (${mode})`, async (t: TestContext) => {
		const ref = React.createRef<{name: string}>();
		const stdout = await renderExample(
			t,
			<Box>
				<ViewTransition ref={ref} name="title">
					<Text>title</Text>
				</ViewTransition>
			</Box>,
			isConcurrent,
		);

		t.assert.strictEqual(stdout.get(), 'title');
		t.assert.deepStrictEqual(ref.current, {name: 'title'});
	});

	test(`update inside <ViewTransition> in a transition renders (${mode})`, async (t: TestContext) => {
		let update = (_count: number) => {};
		function Example() {
			const [count, setCount] = useState(0);
			update = setCount;
			return (
				<Box>
					<ViewTransition>
						<Text>count {count}</Text>
					</ViewTransition>
				</Box>
			);
		}

		const stdout = await renderExample(t, <Example />, isConcurrent);
		t.assert.strictEqual(stdout.get(), 'count 0');

		await act(async () => {
			startTransition(() => {
				update(1);
			});
		});

		t.assert.strictEqual(stdout.get(), 'count 1');
	});

	test(`<ViewTransition> mounted and removed in a transition renders (${mode})`, async (t: TestContext) => {
		let update = (_isShown: boolean) => {};
		function Example() {
			const [isShown, setIsShown] = useState(false);
			update = setIsShown;
			return (
				<Box>
					<Text>list</Text>
					{isShown && (
						<ViewTransition>
							<Text> item</Text>
						</ViewTransition>
					)}
				</Box>
			);
		}

		const stdout = await renderExample(t, <Example />, isConcurrent);
		t.assert.strictEqual(stdout.get(), 'list');

		await act(async () => {
			startTransition(() => {
				update(true);
			});
		});
		t.assert.strictEqual(stdout.get(), 'list item');

		await act(async () => {
			startTransition(() => {
				update(false);
			});
		});
		t.assert.strictEqual(stdout.get(), 'list');
	});
}
