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
