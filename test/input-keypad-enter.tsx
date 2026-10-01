import test, {type TestContext} from 'node:test';
import React from 'react';
import {render, useInput} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import {act} from './helpers/act.js';

for (const [name, sequence] of [
	['normal Return', '\r'],
	['application keypad Enter', 'OM'],
] as const) {
	test(`${name} submits through useInput`, async (t: TestContext) => {
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
		t.after(() => {
			instance.unmount();
		});
		await act(async () => {
			emitReadable(stdin, sequence);
		});

		t.assert.deepStrictEqual(
			events.map(event => event.isReturn),
			[true],
		);
		// Both keys deliver a carriage return as the input value.
		t.assert.deepStrictEqual(
			events.map(event => event.input),
			['\r'],
		);
	});
}
