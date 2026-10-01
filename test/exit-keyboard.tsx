import test, {type TestContext} from 'node:test';
import React from 'react';
import {render, useInput} from '../src/index.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import createStdout from './helpers/create-stdout.js';
import {act} from './helpers/act.js';

for (const {name, input, exitOnCtrlC, shouldExit} of [
	{name: 'legacy Ctrl+C', input: '\u{3}', exitOnCtrlC: true, shouldExit: true},
	{
		name: 'legacy Ctrl+C with an undefined exit option',
		input: '\u{3}',
		exitOnCtrlC: undefined,
		shouldExit: true,
	},
	{
		name: 'kitty Ctrl+C',
		input: '\u{1B}[99;5u',
		exitOnCtrlC: true,
		shouldExit: true,
	},
	{
		name: 'kitty Ctrl+C repeat',
		input: '\u{1B}[99;5:2u',
		exitOnCtrlC: true,
		shouldExit: true,
	},
	{
		name: 'kitty Ctrl+C release',
		input: '\u{1B}[99;5:3u',
		exitOnCtrlC: true,
		shouldExit: false,
	},
	{
		name: 'kitty Ctrl+C with automatic exit disabled',
		input: '\u{1B}[99;5u',
		exitOnCtrlC: false,
		shouldExit: false,
	},
	{
		name: 'kitty c without Ctrl',
		input: '\u{1B}[99u',
		exitOnCtrlC: true,
		shouldExit: false,
	},
]) {
	test(`automatic exit handles ${name}`, async (t: TestContext) => {
		let wasInputReceived = false;
		function Input() {
			useInput(() => {
				wasInputReceived = true;
			});
			return null;
		}

		const stdin = createStdin();
		const stdout = createStdout();
		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<Input />, {
				stdin,
				stdout,
				exitOnCtrlC,
				concurrent: true,
			});
		});

		let isExited = false;
		const exitPromise = instance.waitUntilExit().then(() => {
			isExited = true;
		});
		t.after(async () => {
			instance.unmount();
			await exitPromise;
		});

		await act(async () => {
			emitReadable(stdin, input);
		});

		t.assert.strictEqual(isExited, shouldExit);
		t.assert.strictEqual(wasInputReceived, !shouldExit);
	});
}
