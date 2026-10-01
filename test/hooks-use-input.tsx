import test, {type TestContext} from 'node:test';
import React from 'react';
import {render, useInput} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import term from './helpers/term.js';
import {act} from './helpers/act.js';

test('useInput - handle legacy Ctrl+Space', async (t: TestContext) => {
	const ps = term('use-input', ['ctrlSpace']);
	ps.write('\u{0}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle Ctrl+punctuation shortcut', async (t: TestContext) => {
	const ps = term('use-input', ['ctrlPunctuation']);
	ps.write('\u{1F}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - discrete priority keeps states in sync with useTransition during rapid input', async (t: TestContext) => {
	const ps = term('use-input-discrete-priority');
	// Simulate rapid delete key repeat at ~30ms intervals.
	// State starts pre-populated with "abcde". Send 5 rapid deletes
	// to clear it, then wait for transitions to settle and check state.
	const delay = async (ms: number) =>
		new Promise(resolve => {
			setTimeout(resolve, ms);
		});
	const pressDeleteKey = () => {
		ps.write('\u{1B}[3~');
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
	t.diagnostic(`Output: ${finalMatch?.[0] ?? ps.output.slice(-300)}`);
	t.assert.ok(ps.output.includes('FINAL query:"" deferred:""'));
});

test('useInput - handle lowercase character', async (t: TestContext) => {
	const ps = term('use-input', ['lowercase']);
	ps.write('q');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle uppercase character', async (t: TestContext) => {
	const ps = term('use-input', ['uppercase']);
	ps.write('Q');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - \\r should not count as an uppercase character', async (t: TestContext) => {
	const ps = term('use-input', ['uppercase']);
	ps.write('\r');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - pasted carriage return', async (t: TestContext) => {
	const ps = term('use-input', ['pastedCarriageReturn']);
	ps.write('\rtest');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - pasted tab', async (t: TestContext) => {
	const ps = term('use-input', ['pastedTab']);
	ps.write('\ttest');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - receives bracketed paste when no usePaste handler is active', async (t: TestContext) => {
	const ps = term('use-input', ['bracketedPaste']);
	ps.write('\u{1B}[200~hello\u{1B}[201~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle escape', async (t: TestContext) => {
	const ps = term('use-input', ['escape']);
	ps.write('\u{1B}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - escape does not set meta', async (t: TestContext) => {
	const ps = term('use-input', ['escapeNoMeta']);
	ps.write('\u{1B}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle ctrl', async (t: TestContext) => {
	const ps = term('use-input', ['ctrl']);
	ps.write('\u{6}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta', async (t: TestContext) => {
	const ps = term('use-input', ['meta']);
	ps.write('\u{1B}m');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle ctrl + meta + letter', async (t: TestContext) => {
	const ps = term('use-input', ['ctrlMeta']);
	ps.write('\u{1B}\u{2}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta + backspace (0x7F)', async (t: TestContext) => {
	const ps = term('use-input', ['metaBackspace']);
	ps.write('\u{1B}\u{7F}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - flushes ESC[ prefix as literal input', async (t: TestContext) => {
	const ps = term('use-input', ['escapeBracketPrefix']);
	ps.write('\u{1B}[');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta + O with pending flush', async (t: TestContext) => {
	const ps = term('use-input', ['metaUpperO']);
	ps.write('\u{1B}O');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle tab', async (t: TestContext) => {
	const ps = term('use-input', ['tab']);
	ps.write('\t');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta + tab', async (t: TestContext) => {
	const ps = term('use-input', ['metaTab']);
	ps.write('\u{1B}\t');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle shift + tab', async (t: TestContext) => {
	const ps = term('use-input', ['shiftTab']);
	ps.write('\u{1B}[Z');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle backspace', async (t: TestContext) => {
	const ps = term('use-input', ['backspace']);
	ps.write('\u{8}');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle delete', async (t: TestContext) => {
	const ps = term('use-input', ['delete']);
	ps.write('\u{1B}[3~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle remove (delete)', async (t: TestContext) => {
	const ps = term('use-input', ['remove']);
	ps.write('\u{1B}[3~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle option + return (macOS)', async (t: TestContext) => {
	const ps = term('use-input', ['returnMeta']);
	ps.write('\u{1B}\r');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle Ctrl+F1 without crashing', async (t: TestContext) => {
	const ps = term('use-input', ['ctrlF1']);
	ps.write('\u{1B}[1;5P');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle unmapped ctrl escape sequence without crashing', async (t: TestContext) => {
	const ps = term('use-input', ['unmappedCtrlSequence']);
	// ESC [ 1 ; 5 I is focus-in with a ctrl modifier, not in the keyName map.
	ps.write('\u{1B}[1;5Iq');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

for (const [name, sequence] of [
	['focus in', '\u{1B}[I'],
	['focus out', '\u{1B}[O'],
	['cursor position report', '\u{1B}[24;80R'],
	['SGR mouse report', '\u{1B}[<0;10;20M'],
	['primary device attributes', '\u{1B}[?62;1;4c'],
	['stray bracketed paste end', '\u{1B}[201~'],
	['unmapped legacy CSI', '\u{1B}[[Z'],
	['unmapped modified SS3', '\u{1B}O1;5Z'],
] as const) {
	test(`useInput - drops unmapped control sequence: ${name}`, async (t: TestContext) => {
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
		t.after(() => {
			instance.unmount();
		});
		await act(async () => {
			emitReadable(stdin, sequence);
		});
		await act(async () => {
			emitReadable(stdin, 'q');
		});

		t.assert.deepStrictEqual(events, [{input: 'q', escape: false}]);
	});
}
