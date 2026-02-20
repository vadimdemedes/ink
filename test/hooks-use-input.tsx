import test from 'ava';
import term from './helpers/term.js';

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

test.serial('useInput - handle escape', async t => {
	const ps = term('use-input', ['escape']);
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
	ps.write('\u007F');
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
