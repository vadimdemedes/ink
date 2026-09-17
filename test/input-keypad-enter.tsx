import React, {act} from 'react';
import test from 'ava';
import {render, useInput} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';

for (const [name, sequence] of [
	['normal Return', '\r'],
	['application keypad Enter', 'OM'],
] as const) {
	test(`${name} submits through useInput`, async t => {
		const stdin = createStdin();
		const events: Array<{input: string; isReturn: boolean}> = [];
		function Example() {
			useInput((input, key) => {
				events.push({input, isReturn: key.return});
			});
			return null;
		}

		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<Example />, {
				stdin,
				stdout: createStdout(),
				patchConsole: false,
			});
		});
		t.teardown(() => {
			instance.unmount();
		});
		await act(async () => {
			emitReadable(stdin, sequence);
		});

		t.deepEqual(
			events.map(event => event.isReturn),
			[true],
		);
		// Both keys deliver a carriage return as the input value.
		t.deepEqual(
			events.map(event => event.input),
			['\r'],
		);
	});
}
