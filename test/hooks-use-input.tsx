import test from 'ava';
import term from './helpers/term.js';

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
