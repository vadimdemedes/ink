import {Readable} from 'node:stream';
import test, {type TestContext} from 'node:test';
import React from 'react';
import {render, useInput, usePaste} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {act} from './helpers/act.js';

for (const input of ['', 'ab', 'ab']) {
	test(`Ctrl+C exits when buffered with text: ${JSON.stringify(input)}`, async (t: TestContext) => {
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
		t.after(() => {
			instance.unmount();
			stdin.destroy();
		});

		let isExited = false;
		void instance.waitUntilExit().then(() => {
			isExited = true;
		});
		await act(async () => {
			stdin.push(input);
			await new Promise<void>(resolve => {
				setImmediate(resolve);
			});
		});
		t.assert.ok(isExited);
		t.assert.strictEqual(inputs.includes('Ctrl+c'), false);
	});
}

for (const isBracketedPaste of [false, true]) {
	test(`buffered Ctrl+C respects ${isBracketedPaste ? 'bracketed paste' : 'exitOnCtrlC: false'}`, async (t: TestContext) => {
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
				exitOnCtrlC: isBracketedPaste,
			});
		});
		t.after(() => {
			instance.unmount();
			stdin.destroy();
		});

		let isExited = false;
		void instance.waitUntilExit().then(() => {
			isExited = true;
		});
		const input = `ab${String.fromCodePoint(3)}cd`;
		const escape = String.fromCodePoint(27);
		await act(async () => {
			stdin.push(
				isBracketedPaste ? `${escape}[200~${input}${escape}[201~` : input,
			);
			await new Promise<void>(resolve => {
				setImmediate(resolve);
			});
		});

		t.assert.strictEqual(isExited, false);
		t.assert.deepStrictEqual(
			inputs,
			isBracketedPaste ? [] : ['ab', 'Ctrl+c', 'cd'],
		);
		t.assert.deepStrictEqual(pastes, isBracketedPaste ? [input] : []);
	});
}
