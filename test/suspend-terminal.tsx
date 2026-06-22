import React, {useEffect} from 'react';
import test from 'ava';
import stripAnsi from 'strip-ansi';
import {render, useApp, useInput, useStdout, Text} from '../src/index.js';
import {type SuspendTerminal} from '../src/components/AppContext.js';
import createStdout, {type FakeStdout} from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';
import term from './helpers/term.js';

const showCursor = '[?25h';
const hideCursor = '[?25l';
const enterAltScreen = '[?1049h';
const exitAltScreen = '[?1049l';

const delay = async (ms: number) =>
	new Promise(resolve => {
		setTimeout(resolve, ms);
	});

const lastSetRawModeArg = (stdin: NodeJS.WriteStream): boolean | undefined => {
	const calls = (stdin.setRawMode as unknown as {args: unknown[][]}).args;
	return calls.at(-1)?.[0] as boolean | undefined;
};

// Renders an interactive app (raw mode on via useInput) and runs `run` with the
// app's suspendTerminal once mounted. Resolves after `run` settles.
const renderWithSuspend = async (
	run: (
		suspendTerminal: SuspendTerminal,
		stdin: NodeJS.WriteStream,
	) => Promise<void>,
): Promise<{stdout: FakeStdout; stdin: NodeJS.WriteStream}> => {
	const stdout = createStdout();
	const stdin = createStdin();

	let finished!: () => void;
	const done = new Promise<void>(resolve => {
		finished = resolve;
	});

	function Example() {
		const {suspendTerminal} = useApp();
		useInput(() => {});

		useEffect(() => {
			void (async () => {
				try {
					await run(suspendTerminal, stdin);
				} finally {
					finished();
				}
			})();
		}, [suspendTerminal]);

		return <Text>hello</Text>;
	}

	const {unmount} = render(<Example />, {stdout, stdin, interactive: true});
	await done;
	await delay(50);
	unmount();

	return {stdout, stdin};
};

// Note: raw mode is captured inside the run callback (before the harness
// unmounts), because unmount's cleanup disables raw mode and would otherwise be
// the last recorded setRawMode call.
test('suspendTerminal hands the terminal to the callback, then restores Ink', async t => {
	let ranInsideCallback = false;
	let rawModeDuringCallback: boolean | undefined;
	let rawModeAfterCallback: boolean | undefined;

	const {stdout} = await renderWithSuspend(async (suspendTerminal, stdin) => {
		await suspendTerminal(async () => {
			ranInsideCallback = true;
			rawModeDuringCallback = lastSetRawModeArg(stdin);
		});
		rawModeAfterCallback = lastSetRawModeArg(stdin);
	});

	t.true(ranInsideCallback);
	// Raw mode disabled for the child, re-enabled once Ink reclaimed the terminal.
	t.false(rawModeDuringCallback);
	t.true(rawModeAfterCallback);
	// Cursor shown for the child, then hidden again by the forced redraw.
	t.true(stdout.getWrites().some(write => write.includes(showCursor)));
	t.true(stdout.getWrites().some(write => write.includes(hideCursor)));
});

test('suspendTerminal restores the terminal even if the callback throws', async t => {
	let threw = false;
	let rawModeAfterThrow: boolean | undefined;

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		try {
			await suspendTerminal(async () => {
				throw new Error('boom');
			});
		} catch {
			threw = true;
		}

		rawModeAfterThrow = lastSetRawModeArg(stdin);
	});

	t.true(threw);
	// Raw mode was reclaimed despite the throw.
	t.true(rawModeAfterThrow);
});

test('suspendTerminal returns a disposable that resumes on resume()', async t => {
	let rawModeWhileSuspended: boolean | undefined;
	let rawModeAfterResume: boolean | undefined;

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		const suspension = await suspendTerminal();
		rawModeWhileSuspended = lastSetRawModeArg(stdin);
		await suspension.resume();
		rawModeAfterResume = lastSetRawModeArg(stdin);
	});

	t.false(rawModeWhileSuspended);
	t.true(rawModeAfterResume);
});

test('suspendTerminal disposable resumes via Symbol.asyncDispose', async t => {
	let rawModeWhileSuspended: boolean | undefined;
	let rawModeAfterDispose: boolean | undefined;

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		const suspension = await suspendTerminal();
		rawModeWhileSuspended = lastSetRawModeArg(stdin);
		await suspension[Symbol.asyncDispose]();
		rawModeAfterDispose = lastSetRawModeArg(stdin);
	});

	t.false(rawModeWhileSuspended);
	t.true(rawModeAfterDispose);
});

test('suspendTerminal keeps Ink off the terminal while suspended', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	let writesDuringSuspend: number | undefined;

	let finished!: () => void;
	const done = new Promise<void>(resolve => {
		finished = resolve;
	});

	function Example() {
		const {suspendTerminal} = useApp();
		const {write} = useStdout();
		useInput(() => {});

		useEffect(() => {
			void (async () => {
				try {
					await suspendTerminal(async () => {
						const before = stdout.getWrites().length;
						// A write through Ink's stdout context while suspended must be a
						// no-op so it cannot corrupt the child process's screen.
						write('output while suspended');
						writesDuringSuspend = stdout.getWrites().length - before;
					});
				} finally {
					finished();
				}
			})();
		}, [suspendTerminal, write]);

		return <Text>hello</Text>;
	}

	const {unmount} = render(<Example />, {stdout, stdin, interactive: true});
	await done;
	await delay(50);
	unmount();

	t.is(writesDuringSuspend, 0);
});

test('suspendTerminal runs the callback but skips the handoff when not interactive', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	let ranCallback = false;

	let finished!: () => void;
	const done = new Promise<void>(resolve => {
		finished = resolve;
	});

	function Example() {
		const {suspendTerminal} = useApp();

		useEffect(() => {
			void (async () => {
				try {
					await suspendTerminal(async () => {
						ranCallback = true;
					});
				} finally {
					finished();
				}
			})();
		}, [suspendTerminal]);

		return <Text>hello</Text>;
	}

	const {unmount} = render(<Example />, {stdout, stdin, interactive: false});
	await done;
	await delay(20);
	unmount();

	// The callback still runs, but Ink performs no terminal handoff (no cursor
	// reveal) in non-interactive mode.
	t.true(ranCallback);
	t.false(stdout.getWrites().some(write => write.includes(showCursor)));
});

test('suspendTerminal rejects a nested suspend while already suspended', async t => {
	let nestedRejected = false;

	await renderWithSuspend(async suspendTerminal => {
		await suspendTerminal(async () => {
			await t.throwsAsync(
				suspendTerminal(async () => {}),
				{
					message: /already suspended/,
				},
			);
			nestedRejected = true;
		});
	});

	t.true(nestedRejected);
});

test.serial(
	'suspendTerminal hands the terminal to a child process, then redraws (PTY)',
	async t => {
		const ps = term('suspend-terminal');
		await ps.waitForExit();

		const {output} = ps;

		// The child process wrote directly to the terminal during suspension.
		t.true(output.includes('CHILD_OUTPUT'));
		// Ink showed the cursor when handing the terminal over.
		t.true(output.includes(showCursor));
		// Ink reclaimed the terminal and repainted its frame after the child output,
		// re-hiding the cursor as part of the redraw.
		const afterChild = output.slice(
			output.lastIndexOf('CHILD_OUTPUT') + 'CHILD_OUTPUT'.length,
		);
		t.true(stripAnsi(afterChild).includes('Ink frame'));
		t.true(afterChild.includes(hideCursor));
	},
);

test('suspendTerminal exits and re-enters the alternate screen', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	let exitedAltDuringSuspend: boolean | undefined;
	let reEnteredAltAfterResume: boolean | undefined;

	let finished!: () => void;
	const done = new Promise<void>(resolve => {
		finished = resolve;
	});

	function Example() {
		const {suspendTerminal} = useApp();
		useInput(() => {});

		useEffect(() => {
			void (async () => {
				try {
					let writesAtCallbackEnd = 0;
					await suspendTerminal(async () => {
						exitedAltDuringSuspend = stdout
							.getWrites()
							.some(write => write.includes(exitAltScreen));
						writesAtCallbackEnd = stdout.getWrites().length;
					});
					reEnteredAltAfterResume = stdout
						.getWrites()
						.slice(writesAtCallbackEnd)
						.some(write => write.includes(enterAltScreen));
				} finally {
					finished();
				}
			})();
		}, [suspendTerminal]);

		return <Text>hello</Text>;
	}

	const {unmount} = render(<Example />, {
		stdout,
		stdin,
		alternateScreen: true,
		interactive: true,
	});
	await done;
	await delay(50);
	unmount();

	t.true(exitedAltDuringSuspend);
	t.true(reEnteredAltAfterResume);
});

test('suspendTerminal rolls back so a later suspend works if handover throws', async t => {
	let firstRejected = false;
	let secondSucceeded = false;

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		const rawModeController = stdin as unknown as {
			setRawMode: (value: boolean) => unknown;
		};
		const originalSetRawMode = rawModeController.setRawMode;
		// Force the pause's setRawMode(false) to throw so beginSuspend's rollback runs.
		rawModeController.setRawMode = (value: boolean) => {
			if (!value) {
				throw new Error('handover boom');
			}

			return stdin;
		};

		try {
			await suspendTerminal(async () => {});
		} catch {
			firstRejected = true;
		}

		// Stop throwing; the app must not be stuck in a suspended state.
		rawModeController.setRawMode = originalSetRawMode;

		try {
			await suspendTerminal(async () => {});
			secondSucceeded = true;
		} catch {}
	});

	t.true(firstRejected);
	t.true(secondSucceeded);
});
