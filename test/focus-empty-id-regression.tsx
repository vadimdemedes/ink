import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, render, useFocus, useFocusManager} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import {act} from './helpers/act.js';

function Field({
	id,
	autoFocus = false,
}: {
	readonly id: string;
	readonly autoFocus?: boolean;
}) {
	const {isFocused} = useFocus({id, autoFocus});

	return (
		<Text>{`${id === '' ? 'empty' : id}: ${isFocused ? 'focused' : 'blurred'}`}</Text>
	);
}

for (const method of ['programmatic', 'tab'] as const) {
	test(`empty focus ID reports focus after ${method} navigation`, async (t: TestContext) => {
		const stdout = createStdout();
		const stdin = createStdin();
		let manager!: ReturnType<typeof useFocusManager>;

		function Form() {
			manager = useFocusManager();
			return <Field id="" />;
		}

		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<Form />, {
				stdout,
				stdin,
				debug: true,
				concurrent: true,
			});
		});
		t.after(async () => {
			await act(async () => {
				instance.unmount();
			});
		});
		t.assert.strictEqual(stdout.get(), 'empty: blurred');

		await act(async () => {
			if (method === 'programmatic') {
				manager.focus('');
			} else {
				emitReadable(stdin, '\t');
			}
		});

		t.assert.strictEqual(manager.activeId, '');
		t.assert.strictEqual(stdout.get(), 'empty: focused');
	});
}

test('autofocus does not replace an already focused empty ID', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();
	let activeId: string | undefined;

	function Form() {
		({activeId} = useFocusManager());
		return (
			<Box flexDirection="column">
				<Field autoFocus id="" />
				<Field autoFocus id="second" />
			</Box>
		);
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Form />, {stdout, stdin, debug: true, concurrent: true});
	});
	t.after(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	t.assert.strictEqual(activeId, '');
	t.assert.strictEqual(stdout.get(), 'empty: focused\nsecond: blurred');
});
