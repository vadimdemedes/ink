import React, {act} from 'react';
import test from 'ava';
import {Box, Text, render, useFocus, useFocusManager} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';

function Field({id}: {readonly id: string}) {
	const {isFocused} = useFocus({id});
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

async function renderDuplicates(ids: string[]) {
	const stdout = createStdout();
	const stdin = createStdin();
	let manager!: ReturnType<typeof useFocusManager>;

	function Form() {
		manager = useFocusManager();
		return (
			<Box flexDirection="column">
				{ids.map((id, index) => {
					const key = `${id}-${index}`;
					return <Field key={key} id={id} />;
				})}
			</Box>
		);
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Form />, {
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
		async tab(count: number) {
			return press('\t', count);
		},
		async shiftTab(count: number) {
			return press('\u001B[Z', count);
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
