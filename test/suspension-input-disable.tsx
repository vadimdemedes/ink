import test, {type TestContext} from 'node:test';
import React, {useEffect} from 'react';
import {type SinonStub} from 'sinon';
import {render, useApp, useInput, usePaste} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import {act} from './helpers/act.js';

const setRawModeArgs = (stdin: NodeJS.WriteStream): boolean[] =>
	(stdin.setRawMode as unknown as {args: unknown[][]}).args.map(
		args => args[0] as boolean,
	);

test('resuming does not enable raw mode for a disabled input hook', async (t: TestContext) => {
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
	t.after(() => {
		instance.unmount();
	});
	const suspension = await app.suspendTerminal();
	const callCount = setRawModeArgs(stdin).length;
	await act(async () => {
		instance.rerender(<Example isActive={false} />);
	});
	await suspension.resume();

	t.assert.deepStrictEqual(setRawModeArgs(stdin).slice(callCount), []);
	t.assert.strictEqual(stdin.listenerCount('readable'), 0);
});

for (const shouldKeepInput of [false, true]) {
	test(`resuming does not restore disabled bracketed paste (other input active: ${shouldKeepInput})`, async (t: TestContext) => {
		const stdin = createStdin();
		const stdout = createStdout();
		let app!: ReturnType<typeof useApp>;
		function Example({isActive}: {readonly isActive: boolean}) {
			app = useApp();
			usePaste(() => {}, {isActive});
			useInput(() => {}, {isActive: shouldKeepInput});
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
		t.after(() => {
			instance.unmount();
		});
		const suspension = await app.suspendTerminal();
		const writeCount = stdout.getWrites().length;
		await act(async () => {
			instance.rerender(<Example isActive={false} />);
		});
		await suspension.resume();

		t.assert.strictEqual(
			stdout.getWrites().slice(writeCount).join('').includes('[?2004'),
			false,
		);
		t.assert.strictEqual(
			(stdin.setRawMode as SinonStub).lastCall.args[0],
			shouldKeepInput,
		);
		t.assert.strictEqual(
			stdin.listenerCount('readable'),
			shouldKeepInput ? 1 : 0,
		);
	});
}

test('resuming enables raw mode for an input hook activated while suspended', async (t: TestContext) => {
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
	t.after(() => {
		instance.unmount();
	});
	const suspension = await app.suspendTerminal();
	await act(async () => {
		instance.rerender(<Example isActive />);
	});
	await suspension.resume();

	t.assert.strictEqual((stdin.setRawMode as SinonStub).lastCall.args[0], true);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);
});

test('an input hook activated while suspended does not take input until resume', async (t: TestContext) => {
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
	t.after(() => {
		instance.unmount();
	});
	const suspension = await app.suspendTerminal();
	const callCount = setRawModeArgs(stdin).length;
	await act(async () => {
		instance.rerender(<Example isActive />);
	});

	t.assert.deepStrictEqual(setRawModeArgs(stdin).slice(callCount), []);
	t.assert.strictEqual(stdin.listenerCount('readable'), 0);
	emitReadable(stdin, 'x');
	t.assert.deepStrictEqual(inputs, []);

	await suspension.resume();

	t.assert.deepStrictEqual(setRawModeArgs(stdin).slice(callCount), [true]);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);
	emitReadable(stdin, 'y');
	t.assert.deepStrictEqual(inputs, ['y']);
});

test('a paste hook activated while suspended does not enable bracketed paste until resume', async (t: TestContext) => {
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
	t.after(() => {
		instance.unmount();
	});
	const suspension = await app.suspendTerminal();
	const callCount = setRawModeArgs(stdin).length;
	const writeCount = stdout.getWrites().length;
	const pasteEnableCount = () =>
		stdout
			.getWrites()
			.slice(writeCount)
			.filter(write => write.includes('\u{1B}[?2004h')).length;

	await act(async () => {
		instance.rerender(<Example isActive />);
	});

	t.assert.strictEqual(pasteEnableCount(), 0);
	t.assert.deepStrictEqual(setRawModeArgs(stdin).slice(callCount), []);
	t.assert.strictEqual(stdin.listenerCount('readable'), 0);

	await suspension.resume();

	t.assert.strictEqual(pasteEnableCount(), 1);
	t.assert.deepStrictEqual(setRawModeArgs(stdin).slice(callCount), [true]);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);
});

test('suspending in the same commit that disables the last input hook disables raw mode before the callback runs', async (t: TestContext) => {
	const stdin = createStdin();
	const log: string[] = [];
	(stdin.setRawMode as SinonStub).callsFake((isEnabled: boolean) => {
		log.push(`setRawMode(${isEnabled})`);
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
				const {promise, resolve} = Promise.withResolvers<void>();
				resume = resolve;
				await promise;
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
	t.after(() => {
		instance.unmount();
	});
	log.length = 0;

	await act(async () => {
		instance.rerender(<Example suspended />);
	});
	await new Promise(resolve => {
		setTimeout(resolve, 0);
	});

	t.assert.deepStrictEqual(log, ['setRawMode(false)', 'callback start']);
	t.assert.strictEqual(stdin.listenerCount('readable'), 0);

	resume();
	await new Promise(resolve => {
		setTimeout(resolve, 0);
	});

	t.assert.deepStrictEqual(log, ['setRawMode(false)', 'callback start']);
	t.assert.strictEqual(stdin.listenerCount('readable'), 0);
});
