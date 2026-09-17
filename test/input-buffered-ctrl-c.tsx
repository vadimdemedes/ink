import {Readable} from 'node:stream';
import React, {act} from 'react';
import test from 'ava';
import {render, useInput, usePaste} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

for (const input of ['', 'ab', 'ab']) {
	test(`Ctrl+C exits when buffered with text: ${JSON.stringify(input)}`, async t => {
		const stdin = Object.assign(new Readable({read() {}}), {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			isTTY: true,
			setRawMode() {},
		});
		const inputs: string[] = [];
		function Example() {
			useInput((value, key) => {
				inputs.push(key.ctrl ? `Ctrl+${value}` : value);
			});
			return null;
		}

		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<Example />, {
				stdin,
				stdout: createStdout(),
				interactive: true,
				patchConsole: false,
				exitOnCtrlC: true,
			});
		});
		t.teardown(() => {
			instance.unmount();
			stdin.destroy();
		});

		let exited = false;
		void instance.waitUntilExit().then(() => {
			exited = true;
		});
		await act(async () => {
			stdin.push(input);
			await new Promise<void>(resolve => {
				setImmediate(resolve);
			});
		});
		t.true(exited);
		t.false(inputs.includes('Ctrl+c'));
	});
}

for (const bracketedPaste of [false, true]) {
	test(`buffered Ctrl+C respects ${bracketedPaste ? 'bracketed paste' : 'exitOnCtrlC: false'}`, async t => {
		const stdin = Object.assign(new Readable({read() {}}), {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			isTTY: true,
			setRawMode() {},
		});
		const inputs: string[] = [];
		const pastes: string[] = [];
		function Example() {
			useInput((value, key) => {
				inputs.push(key.ctrl ? `Ctrl+${value}` : value);
			});
			usePaste(value => {
				pastes.push(value);
			});
			return null;
		}

		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<Example />, {
				stdin,
				stdout: createStdout(),
				interactive: true,
				patchConsole: false,
				exitOnCtrlC: bracketedPaste,
			});
		});
		t.teardown(() => {
			instance.unmount();
			stdin.destroy();
		});

		let exited = false;
		void instance.waitUntilExit().then(() => {
			exited = true;
		});
		const input = `ab${String.fromCodePoint(3)}cd`;
		const escape = String.fromCodePoint(27);
		await act(async () => {
			stdin.push(
				bracketedPaste ? `${escape}[200~${input}${escape}[201~` : input,
			);
			await new Promise<void>(resolve => {
				setImmediate(resolve);
			});
		});

		t.false(exited);
		t.deepEqual(inputs, bracketedPaste ? [] : ['ab', 'Ctrl+c', 'cd']);
		t.deepEqual(pastes, bracketedPaste ? [input] : []);
	});
}
