import React, {act} from 'react';
import test from 'ava';
import {Box, Text, render, useFocus, useFocusManager} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';

function Field({
	id,
	isActive = true,
}: {
	readonly id: string;
	readonly isActive?: boolean;
}) {
	const {isFocused} = useFocus({id, isActive});
	return <Text>{`${id}: ${isFocused ? 'focused' : 'blurred'}`}</Text>;
}

test('focus navigation keeps registration order after keyed reordering', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let manager!: ReturnType<typeof useFocusManager>;

	function Form({order}: {readonly order: string[]}) {
		manager = useFocusManager();
		return (
			<Box flexDirection="column">
				{order.map(id => (
					<Field key={id} id={id} />
				))}
			</Box>
		);
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Form order={['a', 'b', 'c']} />, {
			stdout,
			stdin,
			debug: true,
			concurrent: true,
			patchConsole: false,
		});
	});
	t.teardown(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	await act(async () => {
		instance.rerender(<Form order={['c', 'a', 'b']} />);
	});
	t.is(stdout.get(), 'c: blurred\na: blurred\nb: blurred');

	await act(async () => {
		emitReadable(stdin, '\t');
	});
	t.is(manager.activeId, 'a');
});

type DuplicateFormProps = {
	readonly ids: string[];
	readonly inactiveKeys: string[];
};

async function renderDuplicates(ids: string[], inactiveKeys: string[] = []) {
	const stdout = createStdout();
	const stdin = createStdin();
	let manager!: ReturnType<typeof useFocusManager>;

	function Form({ids, inactiveKeys}: DuplicateFormProps) {
		manager = useFocusManager();
		return (
			<Box flexDirection="column">
				{ids.map((id, index) => {
					const key = `${id}-${index}`;
					return (
						<Field key={key} id={id} isActive={!inactiveKeys.includes(key)} />
					);
				})}
			</Box>
		);
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Form ids={ids} inactiveKeys={inactiveKeys} />, {
			stdout,
			stdin,
			debug: true,
			concurrent: true,
			patchConsole: false,
		});
	});

	const press = async (input: string, count: number) => {
		const activeIds: Array<string | undefined> = [];

		for (let index = 0; index < count; index++) {
			// eslint-disable-next-line no-await-in-loop -- Each keypress must commit before reading the active ID.
			await act(async () => {
				emitReadable(stdin, input);
			});
			activeIds.push(manager.activeId);
		}

		return activeIds;
	};

	return {
		stdout,
		instance,
		getActiveId: () => manager.activeId,
		async tab(count: number) {
			return press('\t', count);
		},
		async shiftTab(count: number) {
			return press('\u001B[Z', count);
		},
		async rerender(ids: string[]) {
			await act(async () => {
				instance.rerender(<Form ids={ids} inactiveKeys={inactiveKeys} />);
			});
		},
	};
}

test('Tab visits a duplicated focus ID once and reaches the components after it', async t => {
	const {instance, stdout, tab, shiftTab} = await renderDuplicates([
		'a',
		'x',
		'x',
		'b',
	]);
	t.teardown(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	t.deepEqual(await tab(5), ['a', 'x', 'b', 'a', 'x']);
	t.is(stdout.get(), 'a: blurred\nx: focused\nx: focused\nb: blurred');
	t.deepEqual(await shiftTab(4), ['a', 'b', 'x', 'a']);
});

test('Tab visits a non-adjacent duplicated focus ID at its first registration', async t => {
	const {instance, tab, shiftTab} = await renderDuplicates([
		'x',
		'a',
		'x',
		'b',
	]);
	t.teardown(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	t.deepEqual(await tab(4), ['x', 'a', 'b', 'x']);
	t.deepEqual(await shiftTab(4), ['b', 'a', 'x', 'b']);
});

test('deactivating a duplicated focus ID still removes it from Tab order', async t => {
	const {instance, stdout, tab} = await renderDuplicates(
		['a', 'x', 'x', 'b'],
		['x-2'],
	);
	t.teardown(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	t.deepEqual(await tab(3), ['a', 'b', 'a']);
	t.is(stdout.get(), 'a: focused\nx: blurred\nx: blurred\nb: blurred');
});

test('unmounting one component with a duplicated focus ID keeps the other in Tab order', async t => {
	const {instance, tab, rerender, getActiveId} = await renderDuplicates([
		'a',
		'x',
		'x',
		'b',
	]);
	t.teardown(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	t.deepEqual(await tab(2), ['a', 'x']);
	await rerender(['a', 'x', 'b']);
	t.is(getActiveId(), 'x');
	t.deepEqual(await tab(3), ['b', 'a', 'x']);
});
