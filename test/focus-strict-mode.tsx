import test, {type TestContext} from 'node:test';
import React, {StrictMode} from 'react';
import {Box, Text, render, useFocus, useFocusManager} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import {act} from './helpers/act.js';

for (const isConcurrent of [false, true]) {
	for (const isStrict of [false, true]) {
		test(`focus updates preserve call order (concurrent: ${isConcurrent}, StrictMode: ${isStrict})`, async (t: TestContext) => {
			const stdin = createStdin();
			const stdout = createStdout();
			let manager!: ReturnType<typeof useFocusManager>;

			function Field({id}: {readonly id: string}) {
				const {isFocused} = useFocus({id});
				return <Text>{isFocused ? `[${id}]` : id}</Text>;
			}

			function Form() {
				manager = useFocusManager();
				return (
					<Box>
						<Field id="a" />
						<Field id="b" />
						<Field id="c" />
					</Box>
				);
			}

			let instance!: ReturnType<typeof render>;
			await act(async () => {
				instance = render(
					isStrict ? (
						<StrictMode>
							<Form />
						</StrictMode>
					) : (
						<Form />
					),
					{
						stdout,
						stdin,
						debug: true,
						concurrent: isConcurrent,
						patchConsole: false,
					},
				);
			});
			t.after(async () => {
				await act(async () => {
					instance.unmount();
				});
			});

			await act(async () => {
				manager.focusNext();
				manager.focusNext();
			});
			t.assert.strictEqual(
				manager.activeId,
				'b',
				'Two batched focusNext calls must advance twice',
			);

			await act(async () => {
				manager.focusNext();
				manager.focus('a');
			});
			t.assert.strictEqual(
				manager.activeId,
				'a',
				'An explicit focus after navigation wins',
			);

			await act(async () => {
				manager.focus('c');
				manager.focusPrevious();
			});
			t.assert.strictEqual(
				manager.activeId,
				'b',
				'Navigation starts from the latest explicit focus',
			);

			/* eslint-disable no-await-in-loop, @typescript-eslint/no-loop-func -- Each action must commit before checking the latest manager value. */
			for (const expected of ['c', 'a', 'b', 'c']) {
				await act(async () => {
					emitReadable(stdin, '\t');
				});
				t.assert.strictEqual(manager.activeId, expected);
			}

			for (const method of ['focusNext', 'focusPrevious', 'focus'] as const) {
				await act(async () => {
					manager.enableFocus();
					manager.focus('b');
				});
				await act(async () => {
					if (method === 'focus') {
						manager.focus('a');
					} else {
						manager[method]();
					}

					manager.disableFocus();
				});
				t.assert.strictEqual(
					manager.activeId,
					undefined,
					`disableFocus must take effect after ${method}`,
				);
				t.assert.strictEqual(stdout.get(), 'abc');

				await act(async () => {
					emitReadable(stdin, '\t');
				});
				t.assert.strictEqual(
					manager.activeId,
					undefined,
					'Tab must remain disabled',
				);
			}

			/* eslint-enable no-await-in-loop, @typescript-eslint/no-loop-func */

			await act(async () => {
				manager.enableFocus();
				emitReadable(stdin, '\t');
			});
			t.assert.strictEqual(
				manager.activeId,
				'a',
				'Re-enabling focus restores keyboard navigation',
			);
			t.assert.strictEqual(stdout.get(), '[a]bc');
		});
	}
}
