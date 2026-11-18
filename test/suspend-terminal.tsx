import test, {type TestContext} from 'node:test';
import React, {useEffect} from 'react';
import stripAnsi from 'strip-ansi';
import ansiEscapes from 'ansi-escapes';
import {
	render,
	useApp,
	useInput,
	usePaste,
	useStdout,
	useStderr,
	Static,
	Text,
} from '../src/index.js';
import {type SuspendTerminal} from '../src/components/AppContext.js';
import {bsu, esu} from '../src/write-synchronized.js';
import createStdout, {type FakeStdout} from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';
import term from './helpers/term.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

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

	const {promise: done, resolve: finished} = Promise.withResolvers<void>();

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
test('suspendTerminal hands the terminal to the callback, then restores Ink', async (t: TestContext) => {
	let didRunInsideCallback = false;
	let rawModeDuringCallback: boolean | undefined;
	let rawModeAfterCallback: boolean | undefined;

	const {stdout} = await renderWithSuspend(async (suspendTerminal, stdin) => {
		await suspendTerminal(async () => {
			didRunInsideCallback = true;
			rawModeDuringCallback = lastSetRawModeArg(stdin);
		});
		rawModeAfterCallback = lastSetRawModeArg(stdin);
	});

	t.assert.ok(didRunInsideCallback);
	// Raw mode disabled for the child, re-enabled once Ink reclaimed the terminal.
	t.assert.strictEqual(rawModeDuringCallback, false);
	t.assert.ok(rawModeAfterCallback);
	// Cursor shown for the child, then hidden again by the forced redraw.
	t.assert.ok(stdout.getWrites().some(write => write.includes(showCursor)));
	t.assert.ok(stdout.getWrites().some(write => write.includes(hideCursor)));
});

for (const hasPasteHook of [false, true]) {
	test(`suspendTerminal erases the frame and shows the cursor before the callback runs, then redraws on resume (paste hook: ${hasPasteHook})`, async (t: TestContext) => {
		const stdout = createStdout();
		let suspendTerminal!: SuspendTerminal;

		function Example() {
			suspendTerminal = useApp().suspendTerminal;
			useInput(() => {});
			usePaste(() => {}, {isActive: hasPasteHook});
			return <Text>hello</Text>;
		}

		const {unmount} = render(<Example />, {
			stdout,
			stdin: createStdin(),
			interactive: true,
		});
		t.after(() => {
			unmount();
		});
		const writesAtMount = stdout.getWrites().length;
		const suspension = await suspendTerminal();
		const writesAtHandoff = stdout.getWrites().length;

		// Bracketed paste is only turned off when a paste hook had turned it on.
		t.assert.deepStrictEqual(stdout.getWrites().slice(writesAtMount), [
			ansiEscapes.eraseLines(2),
			`\u{1B}${showCursor}`,
			...(hasPasteHook ? ['\u{1B}[?2004l'] : []),
		]);

		await suspension.resume();

		// The empty write is the one `resume()` waits on, so the redraw has reached the terminal by the time it resolves.
		t.assert.deepStrictEqual(stdout.getWrites().slice(writesAtHandoff), [
			...(hasPasteHook ? ['\u{1B}[?2004h'] : []),
			bsu,
			`\u{1B}${hideCursor}`,
			'hello\n',
			esu,
			'',
		]);
	});
}

test('suspendTerminal restores the terminal even if the callback throws', async (t: TestContext) => {
	let didThrow = false;
	let rawModeAfterThrow: boolean | undefined;

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		try {
			await suspendTerminal(async () => {
				throw new Error('boom');
			});
		} catch {
			didThrow = true;
		}

		rawModeAfterThrow = lastSetRawModeArg(stdin);
	});

	t.assert.ok(didThrow);
	// Raw mode was reclaimed despite the throw.
	t.assert.ok(rawModeAfterThrow);
});

test('suspendTerminal returns a disposable that resumes on resume()', async (t: TestContext) => {
	let rawModeWhileSuspended: boolean | undefined;
	let rawModeAfterResume: boolean | undefined;

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		const suspension = await suspendTerminal();
		rawModeWhileSuspended = lastSetRawModeArg(stdin);
		await suspension.resume();
		rawModeAfterResume = lastSetRawModeArg(stdin);
	});

	t.assert.strictEqual(rawModeWhileSuspended, false);
	t.assert.ok(rawModeAfterResume);
});

test('suspendTerminal disposable resumes via Symbol.asyncDispose', async (t: TestContext) => {
	let rawModeWhileSuspended: boolean | undefined;
	let rawModeAfterDispose: boolean | undefined;

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		const suspension = await suspendTerminal();
		rawModeWhileSuspended = lastSetRawModeArg(stdin);
		await suspension[Symbol.asyncDispose]();
		rawModeAfterDispose = lastSetRawModeArg(stdin);
	});

	t.assert.strictEqual(rawModeWhileSuspended, false);
	t.assert.ok(rawModeAfterDispose);
});

test('suspendTerminal keeps Ink off the terminal while suspended', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	let writesDuringSuspend: number | undefined;

	const {promise: done, resolve: finished} = Promise.withResolvers<void>();

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

	t.assert.strictEqual(writesDuringSuspend, 0);
});

test('suspendTerminal keeps stderr writes off the terminal while suspended', async (t: TestContext) => {
	const stdout = createStdout();
	const stderr = createStdout();
	let suspendTerminal!: SuspendTerminal;
	let write!: (data: string) => void;

	function Example() {
		suspendTerminal = useApp().suspendTerminal;
		write = useStderr().write;
		return <Text>hello</Text>;
	}

	const {unmount} = render(<Example />, {
		stdout,
		stderr,
		stdin: createStdin(),
		interactive: true,
	});
	t.after(() => {
		unmount();
	});
	await suspendTerminal();
	const writesAtHandoff = stdout.getWrites().length;
	write('output while suspended');

	// The write is dropped, and Ink does not repaint its frame around it either.
	t.assert.deepStrictEqual(stderr.getWrites(), []);
	t.assert.deepStrictEqual(stdout.getWrites().slice(writesAtHandoff), []);
});

test('suspendTerminal runs the callback but skips the handoff when not interactive', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	let didRunCallback = false;

	const {promise: done, resolve: finished} = Promise.withResolvers<void>();

	function Example() {
		const {suspendTerminal} = useApp();

		useEffect(() => {
			void (async () => {
				try {
					await suspendTerminal(async () => {
						didRunCallback = true;
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
	t.assert.ok(didRunCallback);
	t.assert.strictEqual(
		stdout.getWrites().some(write => write.includes(showCursor)),
		false,
	);
});

test('suspendTerminal rejects a nested suspend while already suspended', async (t: TestContext) => {
	let wasNestedRejected = false;

	await renderWithSuspend(async suspendTerminal => {
		await suspendTerminal(async () => {
			await t.assert.rejects(
				suspendTerminal(async () => {}),
				{
					message: /already suspended/,
				},
			);
			wasNestedRejected = true;
		});
	});

	t.assert.ok(wasNestedRejected);
});

test('suspendTerminal hands the terminal to a child process, then redraws (PTY)', async (t: TestContext) => {
	const ps = term('suspend-terminal');
	await ps.waitForExit();

	const {output} = ps;

	// The child process wrote directly to the terminal during suspension.
	t.assert.ok(output.includes('CHILD_OUTPUT'));
	// Ink showed the cursor when handing the terminal over.
	t.assert.ok(output.includes(showCursor));
	// Ink reclaimed the terminal and repainted its frame after the child output,
	// re-hiding the cursor as part of the redraw.
	const afterChild = output.slice(
		output.lastIndexOf('CHILD_OUTPUT') + 'CHILD_OUTPUT'.length,
	);
	t.assert.ok(stripAnsi(afterChild).includes('Ink frame'));
	t.assert.ok(afterChild.includes(hideCursor));
});

test('suspendTerminal exits and re-enters the alternate screen', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	let exitedAltDuringSuspend: boolean | undefined;
	let reEnteredAltAfterResume: boolean | undefined;

	const {promise: done, resolve: finished} = Promise.withResolvers<void>();

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

	t.assert.ok(exitedAltDuringSuspend);
	t.assert.ok(reEnteredAltAfterResume);
});

for (const [mode, options] of Object.entries({
	standard: {},
	incremental: {incrementalRendering: true},
	'screen reader': {isScreenReaderEnabled: true},
	debug: {debug: true},
})) {
	test(`suspendTerminal shows <Static> output once after resume re-enters the alternate screen - ${mode}`, async (t: TestContext) => {
		const rows = 5;
		const stdout = createStdout();
		stdout.rows = rows;
		const stdin = createStdin();

		const {promise: done, resolve: finished} = Promise.withResolvers<void>();

		function Example() {
			const {suspendTerminal} = useApp();
			useInput(() => {});

			useEffect(() => {
				void (async () => {
					try {
						await suspendTerminal(async () => {});
					} finally {
						finished();
					}
				})();
			}, [suspendTerminal]);

			return (
				<>
					<Static items={['S1', 'S2', 'S3']}>
						{item => <Text key={item}>{item}</Text>}
					</Static>
					<Text>live</Text>
				</>
			);
		}

		const {unmount} = render(<Example />, {
			stdout,
			stdin,
			alternateScreen: true,
			interactive: true,
			patchConsole: false,
			...options,
		});
		await done;
		await delay(50);

		// Re-entering the alternate screen starts from an empty buffer, so reconstruct only what was written from that point on. The redraw carries no new <Static> items, so the rows must come from the replay, or in debug mode from the redraw alone, which writes every item itself.
		const output = stdout.getWrites().join('');
		const resumed = output.lastIndexOf(enterAltScreen);
		t.assert.ok(
			resumed >= 0,
			'Expected resume to re-enter the alternate screen',
		);

		t.assert.deepStrictEqual(
			reconstructTerminalLines(
				output.slice(resumed + enterAltScreen.length).replaceAll('\n', '\r\n'),
				rows,
			),
			['S1', 'S2', 'S3', 'live', ''],
		);
		unmount();
	});
}

test('suspendTerminal rolls back so a later suspend works if handover throws', async (t: TestContext) => {
	let wasFirstRejected = false;
	let didSecondSucceed = false;
	const rawModeCalls: boolean[] = [];

	await renderWithSuspend(async (suspendTerminal, stdin) => {
		const rawModeController = stdin as unknown as {
			setRawMode: (isEnabled: boolean) => unknown;
		};
		const originalSetRawMode = rawModeController.setRawMode;
		// Force the pause's setRawMode(false) to throw so beginSuspend's rollback runs.
		rawModeController.setRawMode = (isEnabled: boolean) => {
			rawModeCalls.push(isEnabled);
			if (!isEnabled) {
				throw new Error('handover boom');
			}

			return stdin;
		};

		try {
			await suspendTerminal(async () => {});
		} catch {
			wasFirstRejected = true;
		}

		// Stop throwing; the app must not be stuck in a suspended state.
		rawModeController.setRawMode = originalSetRawMode;

		try {
			await suspendTerminal(async () => {});
			didSecondSucceed = true;
		} catch {}
	});

	t.assert.ok(wasFirstRejected);
	// The rollback took input back after the failed handover.
	t.assert.deepStrictEqual(rawModeCalls, [false, true]);
	t.assert.ok(didSecondSucceed);
});

for (const isAlternateScreen of [false, true]) {
	for (const exitMethod of ['unmount', 'exit'] as const) {
		const screen = isAlternateScreen ? 'alternate' : 'primary';

		test(`${exitMethod}() while suspended writes nothing to the terminal (${screen} screen)`, async (t: TestContext) => {
			const stdout = createStdout();
			const stdin = createStdin();
			const {promise: suspended, resolve: onSuspended} =
				Promise.withResolvers<() => void>();

			function Example() {
				const {suspendTerminal, exit} = useApp();
				useInput(() => {});
				usePaste(() => {});

				useEffect(() => {
					void (async () => {
						await suspendTerminal();
						onSuspended(exit);
					})();
				}, [suspendTerminal, exit]);

				return <Text>hello</Text>;
			}

			const {unmount, waitUntilExit} = render(<Example />, {
				stdout,
				stdin,
				alternateScreen: isAlternateScreen,
				interactive: true,
			});
			const exit = await suspended;
			const writesAtHandoff = stdout.getWrites().length;

			if (exitMethod === 'exit') {
				exit();
			} else {
				unmount();
			}

			await waitUntilExit();

			// The handoff already erased the frame, showed the cursor, turned bracketed paste off and left the alternate screen. Only the empty write that `waitUntilExit()` waits on remains.
			t.assert.deepStrictEqual(stdout.getWrites().slice(writesAtHandoff), ['']);
		});
	}
}

test('suspendTerminal() from an effect cleanup during unmount does not skip the terminal cleanup', async (t: TestContext) => {
	const stdout = createStdout();
	const stdin = createStdin();

	function Example() {
		const {suspendTerminal} = useApp();

		useEffect(
			() => () => {
				void suspendTerminal();
			},
			[suspendTerminal],
		);

		return <Text>hello</Text>;
	}

	const {unmount, waitUntilExit} = render(<Example />, {
		stdout,
		stdin,
		alternateScreen: true,
		interactive: true,
	});
	await delay(0);
	const writesBeforeUnmount = stdout.getWrites().length;
	unmount();
	await waitUntilExit();

	t.assert.deepStrictEqual(stdout.getWrites().slice(writesBeforeUnmount), [
		`\u{1B}${showCursor}`,
		`\u{1B}${showCursor}`,
		`\u{1B}${exitAltScreen}`,
		`\u{1B}${showCursor}`,
		'',
	]);
});
