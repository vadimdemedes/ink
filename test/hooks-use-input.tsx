import React, {act} from 'react';
import test from 'ava';
import {render, useInput} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import term from './helpers/term.js';

test.serial('useInput - handle legacy Ctrl+Space', async t => {
	const ps = term('use-input', ['ctrlSpace']);
	ps.write('\u0000');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle Ctrl+punctuation shortcut', async t => {
	const ps = term('use-input', ['ctrlPunctuation']);
	ps.write('\u001F');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - discrete priority keeps states in sync with useTransition during rapid input',
	async t => {
		const ps = term('use-input-discrete-priority');
		// Simulate rapid delete key repeat at ~30ms intervals.
		// State starts pre-populated with "abcde". Send 5 rapid deletes
		// to clear it, then wait for transitions to settle and check state.
		const delay = async (ms: number) =>
			new Promise(resolve => {
				setTimeout(resolve, ms);
			});
		const pressDeleteKey = () => {
			ps.write('\u001B[3~');
		};

		// Use escape sequence for delete key (raw \x7F gets processed by pty)
		for (const delayMilliseconds of [0, 30, 60, 90, 120]) {
			setTimeout(() => {
				pressDeleteKey();
			}, delayMilliseconds);
		}

		await delay(200);

		// Wait for all transitions to settle, then press Enter to report state
		await delay(2000);
		ps.write('\r');
		await ps.waitForExit();
		const finalMatch = /FINAL .+/.exec(ps.output);
		t.log('Output:', finalMatch?.[0] ?? ps.output.slice(-300));
		t.true(ps.output.includes('FINAL query:"" deferred:""'));
	},
);

test.serial('useInput - handle lowercase character', async t => {
	const ps = term('use-input', ['lowercase']);
	ps.write('q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle uppercase character', async t => {
	const ps = term('use-input', ['uppercase']);
	ps.write('Q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - \\r should not count as an uppercase character',
	async t => {
		const ps = term('use-input', ['uppercase']);
		ps.write('\r');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - pasted carriage return', async t => {
	const ps = term('use-input', ['pastedCarriageReturn']);
	ps.write('\rtest');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - pasted tab', async t => {
	const ps = term('use-input', ['pastedTab']);
	ps.write('\ttest');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - receives bracketed paste when no usePaste handler is active',
	async t => {
		const ps = term('use-input', ['bracketedPaste']);
		ps.write('\u001B[200~hello\u001B[201~');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - handle escape', async t => {
	const ps = term('use-input', ['escape']);
	ps.write('\u001B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - escape does not set meta', async t => {
	const ps = term('use-input', ['escapeNoMeta']);
	ps.write('\u001B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl', async t => {
	const ps = term('use-input', ['ctrl']);
	ps.write('\u0006');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta', async t => {
	const ps = term('use-input', ['meta']);
	ps.write('\u001Bm');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + meta + letter', async t => {
	const ps = term('use-input', ['ctrlMeta']);
	ps.write('\u001B\u0002');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + backspace (0x7F)', async t => {
	const ps = term('use-input', ['metaBackspace']);
	ps.write('\u001B\u007F');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - flushes ESC[ prefix as literal input', async t => {
	const ps = term('use-input', ['escapeBracketPrefix']);
	ps.write('\u001B[');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + O with pending flush', async t => {
	const ps = term('use-input', ['metaUpperO']);
	ps.write('\u001BO');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle tab', async t => {
	const ps = term('use-input', ['tab']);
	ps.write('\t');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + tab', async t => {
	const ps = term('use-input', ['metaTab']);
	ps.write('\u001B\t');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle shift + tab', async t => {
	const ps = term('use-input', ['shiftTab']);
	ps.write('\u001B[Z');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle backspace', async t => {
	const ps = term('use-input', ['backspace']);
	ps.write('\u0008');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle delete', async t => {
	const ps = term('use-input', ['delete']);
	ps.write('\u001B[3~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle remove (delete)', async t => {
	const ps = term('use-input', ['remove']);
	ps.write('\u001B[3~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle option + return (macOS)', async t => {
	const ps = term('use-input', ['returnMeta']);
	ps.write('\u001B\r');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle Ctrl+F1 without crashing', async t => {
	const ps = term('use-input', ['ctrlF1']);
	ps.write('\u001B[1;5P');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - handle unmapped ctrl escape sequence without crashing',
	async t => {
		const ps = term('use-input', ['unmappedCtrlSequence']);
		// ESC [ 1 ; 5 I is focus-in with a ctrl modifier, not in the keyName map.
		ps.write('\u001B[1;5Iq');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

for (const [name, sequence] of [
	['focus in', '\u001B[I'],
	['focus out', '\u001B[O'],
	['cursor position report', '\u001B[24;80R'],
	['SGR mouse report', '\u001B[<0;10;20M'],
	['primary device attributes', '\u001B[?62;1;4c'],
	['stray bracketed paste end', '\u001B[201~'],
] as const) {
	test(`useInput - drops unmapped control sequence: ${name}`, async t => {
		const stdin = createStdin();
		const events: Array<{input: string; escape: boolean}> = [];
		function Example() {
			useInput((input, key) => {
				events.push({input, escape: key.escape});
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
		t.teardown(() => {
			instance.unmount();
		});
		await act(async () => {
			emitReadable(stdin, sequence);
		});
		await act(async () => {
			emitReadable(stdin, 'q');
		});

		t.deepEqual(events, [{input: 'q', escape: false}]);
	});
}
