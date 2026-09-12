import React, {act} from 'react';
import test from 'ava';
import {render, useInput} from '../src/index.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import createStdout from './helpers/create-stdout.js';

for (const {name, input, exitOnCtrlC, shouldExit} of [
	{name: 'legacy Ctrl+C', input: '\u0003', exitOnCtrlC: true, shouldExit: true},
	{
		name: 'kitty Ctrl+C',
		input: '\u001B[99;5u',
		exitOnCtrlC: true,
		shouldExit: true,
	},
	{
		name: 'kitty Ctrl+C repeat',
		input: '\u001B[99;5:2u',
		exitOnCtrlC: true,
		shouldExit: true,
	},
	{
		name: 'kitty Ctrl+C release',
		input: '\u001B[99;5:3u',
		exitOnCtrlC: true,
		shouldExit: false,
	},
	{
		name: 'kitty Ctrl+C with automatic exit disabled',
		input: '\u001B[99;5u',
		exitOnCtrlC: false,
		shouldExit: false,
	},
	{
		name: 'kitty c without Ctrl',
		input: '\u001B[99u',
		exitOnCtrlC: true,
		shouldExit: false,
	},
]) {
	test(`automatic exit handles ${name}`, async t => {
		let inputReceived = false;
		function Input() {
			useInput(() => {
				inputReceived = true;
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

		let exited = false;
		const exitPromise = instance.waitUntilExit().then(() => {
			exited = true;
		});
		t.teardown(async () => {
			instance.unmount();
			await exitPromise;
		});

		await act(async () => {
			emitReadable(stdin, input);
		});

		t.is(exited, shouldExit);
		t.is(inputReceived, !shouldExit);
	});
}
