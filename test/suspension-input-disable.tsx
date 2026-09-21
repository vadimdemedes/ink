import React, {act, useEffect} from 'react';
import test from 'ava';
import {type SinonStub} from 'sinon';
import {render, useApp, useInput, usePaste} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';

const setRawModeArgs = (stdin: NodeJS.WriteStream): boolean[] =>
	(stdin.setRawMode as unknown as {args: unknown[][]}).args.map(
		args => args[0] as boolean,
	);

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
	const callCount = setRawModeArgs(stdin).length;
	await act(async () => {
		instance.rerender(<Example isActive={false} />);
	});
	await suspension.resume();

	t.deepEqual(setRawModeArgs(stdin).slice(callCount), []);
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
		const writeCount = stdout.getWrites().length;
		await act(async () => {
			instance.rerender(<Example isActive={false} />);
		});
		await suspension.resume();

		t.false(stdout.getWrites().slice(writeCount).join('').includes('[?2004'));
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

test('an input hook activated while suspended does not take input until resume', async t => {
	const stdin = createStdin();
	let app!: ReturnType<typeof useApp>;
	const inputs: string[] = [];
	function Example({isActive}: {readonly isActive: boolean}) {
		app = useApp();
		useInput(
			input => {
				inputs.push(input);
			},
			{isActive},
		);
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
	const callCount = setRawModeArgs(stdin).length;
	await act(async () => {
		instance.rerender(<Example isActive />);
	});

	t.deepEqual(setRawModeArgs(stdin).slice(callCount), []);
	t.is(stdin.listenerCount('readable'), 0);
	emitReadable(stdin, 'x');
	t.deepEqual(inputs, []);

	await suspension.resume();

	t.deepEqual(setRawModeArgs(stdin).slice(callCount), [true]);
	t.is(stdin.listenerCount('readable'), 1);
	emitReadable(stdin, 'y');
	t.deepEqual(inputs, ['y']);
});

test('a paste hook activated while suspended does not enable bracketed paste until resume', async t => {
	const stdin = createStdin();
	const stdout = createStdout();
	let app!: ReturnType<typeof useApp>;
	function Example({isActive}: {readonly isActive: boolean}) {
		app = useApp();
		usePaste(() => {}, {isActive});
		return null;
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Example isActive={false} />, {
			stdin,
			stdout,
			interactive: true,
			patchConsole: false,
		});
	});
	t.teardown(instance.unmount);
	const suspension = await app.suspendTerminal();
	const callCount = setRawModeArgs(stdin).length;
	const writeCount = stdout.getWrites().length;
	const pasteEnableCount = () =>
		stdout
			.getWrites()
			.slice(writeCount)
			.filter(write => write.includes('\u001B[?2004h')).length;

	await act(async () => {
		instance.rerender(<Example isActive />);
	});

	t.is(pasteEnableCount(), 0);
	t.deepEqual(setRawModeArgs(stdin).slice(callCount), []);
	t.is(stdin.listenerCount('readable'), 0);

	await suspension.resume();

	t.is(pasteEnableCount(), 1);
	t.deepEqual(setRawModeArgs(stdin).slice(callCount), [true]);
	t.is(stdin.listenerCount('readable'), 1);
});

test('suspending in the same commit that disables the last input hook disables raw mode before the callback runs', async t => {
	const stdin = createStdin();
	const log: string[] = [];
	(stdin.setRawMode as SinonStub).callsFake((value: boolean) => {
		log.push(`setRawMode(${value})`);
	});

	let resume!: () => void;
	function Input() {
		useInput(() => {});
		return null;
	}

	function Example({suspended}: {readonly suspended: boolean}) {
		const app = useApp();
		useEffect(() => {
			if (!suspended) {
				return;
			}

			void app.suspendTerminal(async () => {
				log.push('callback start');
				await new Promise<void>(resolve => {
					resume = resolve;
				});
			});
		}, [suspended, app]);
		return suspended ? null : <Input />;
	}

	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<Example suspended={false} />, {
			stdin,
			stdout: createStdout(),
			interactive: true,
			patchConsole: false,
		});
	});
	t.teardown(instance.unmount);
	log.length = 0;

	await act(async () => {
		instance.rerender(<Example suspended />);
	});
	await new Promise(resolve => {
		setTimeout(resolve, 0);
	});

	t.deepEqual(log, ['setRawMode(false)', 'callback start']);
	t.is(stdin.listenerCount('readable'), 0);

	resume();
	await new Promise(resolve => {
		setTimeout(resolve, 0);
	});

	t.deepEqual(log, ['setRawMode(false)', 'callback start']);
	t.is(stdin.listenerCount('readable'), 0);
});
