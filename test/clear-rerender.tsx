import React, {act, useReducer} from 'react';
import test from 'ava';
import {Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

let rerenderHello: () => void;
function Hello() {
	const [, rerender] = useReducer((count: number) => count + 1, 0);
	rerenderHello = rerender;
	return <Text>Hello</Text>;
}

const triggers = {
	rerender(instance: ReturnType<typeof render>) {
		instance.rerender(<Hello />);
	},
	'state update'() {
		rerenderHello();
	},
};

for (const mode of ['standard', 'incremental', 'screen-reader'] as const) {
	for (const [trigger, update] of Object.entries(triggers)) {
		test(`${trigger} restores unchanged content after clear (${mode})`, async t => {
			const stdout = createStdout(80, true);
			stdout.rows = 8;
			let instance!: ReturnType<typeof render>;
			await act(async () => {
				instance = render(<Hello />, {
					stdout,
					interactive: true,
					incrementalRendering: mode === 'incremental',
					isScreenReaderEnabled: mode === 'screen-reader',
					patchConsole: false,
				});
			});
			t.teardown(instance.unmount);
			await instance.waitUntilRenderFlush();
			instance.clear();
			await act(async () => {
				update(instance);
			});
			await instance.waitUntilRenderFlush();

			const lines = reconstructTerminalLines(
				stdout.getWrites().join('').replaceAll('\n', '\r\n'),
				8,
			);
			t.is(lines[0], 'Hello');
		});
	}

	test(`unmount does not restore cleared content (${mode})`, async t => {
		const stdout = createStdout(80, true);
		stdout.rows = 8;
		const instance = render(<Text>Hello</Text>, {
			stdout,
			interactive: true,
			incrementalRendering: mode === 'incremental',
			isScreenReaderEnabled: mode === 'screen-reader',
			patchConsole: false,
		});
		t.teardown(instance.unmount);
		await instance.waitUntilRenderFlush();
		instance.clear();
		instance.unmount();
		await instance.waitUntilExit();

		const lines = reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			8,
		);
		t.true(lines.every(line => line === ''));
	});
}
