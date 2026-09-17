import React, {act} from 'react';
import test from 'ava';
import {type SinonStub} from 'sinon';
import {render, useApp, useInput, usePaste} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

test('resuming does not enable raw mode for a disabled input hook', async t => {
	const stdin = createStdin();
	let app!: ReturnType<typeof useApp>;
	function Example({isActive}: {readonly isActive: boolean}) {
		app = useApp();
		useInput(() => {}, {isActive});
		return null;
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Example isActive />, {
			stdin,
			stdout: createStdout(),
			interactive: true,
			patchConsole: false,
		});
	});
	t.teardown(instance.unmount);
	const suspension = await app.suspendTerminal();
	await act(async () => {
		instance.rerender(<Example isActive={false} />);
	});
	await suspension.resume();

	t.false((stdin.setRawMode as SinonStub).lastCall.args[0]);
	t.is(stdin.listenerCount('readable'), 0);
});

for (const keepInput of [false, true]) {
	test(`resuming does not restore disabled bracketed paste (other input active: ${keepInput})`, async t => {
		const stdin = createStdin();
		const stdout = createStdout();
		let app!: ReturnType<typeof useApp>;
		function Example({isActive}: {readonly isActive: boolean}) {
			app = useApp();
			usePaste(() => {}, {isActive});
			useInput(() => {}, {isActive: keepInput});
			return null;
		}

		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<Example isActive />, {
				stdin,
				stdout,
				interactive: true,
				patchConsole: false,
			});
		});
		t.teardown(instance.unmount);
		const suspension = await app.suspendTerminal();
		await act(async () => {
			instance.rerender(<Example isActive={false} />);
		});
		const writeCount = stdout.getWrites().length;
		await suspension.resume();

		t.false(stdout.getWrites().slice(writeCount).join('').includes('[?2004h'));
		t.is((stdin.setRawMode as SinonStub).lastCall.args[0], keepInput);
		t.is(stdin.listenerCount('readable'), keepInput ? 1 : 0);
	});
}

test('resuming enables raw mode for an input hook activated while suspended', async t => {
	const stdin = createStdin();
	let app!: ReturnType<typeof useApp>;
	function Example({isActive}: {readonly isActive: boolean}) {
		app = useApp();
		useInput(() => {}, {isActive});
		return null;
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Example isActive={false} />, {
			stdin,
			stdout: createStdout(),
			interactive: true,
			patchConsole: false,
		});
	});
	t.teardown(instance.unmount);
	const suspension = await app.suspendTerminal();
	await act(async () => {
		instance.rerender(<Example isActive />);
	});
	await suspension.resume();

	t.true((stdin.setRawMode as SinonStub).lastCall.args[0]);
	t.is(stdin.listenerCount('readable'), 1);
});
