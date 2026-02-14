import test from 'ava';
import term from './helpers/term.js';

test.serial('useInput - handle kitty protocol super modifier', async t => {
	const ps = term('use-input-kitty', ['super']);
	// 's' with super modifier (modifier 9 = super(8) + 1)
	ps.write('\u001B[115;9u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol hyper modifier', async t => {
	const ps = term('use-input-kitty', ['hyper']);
	// 'h' with hyper modifier (modifier 17 = hyper(16) + 1)
	ps.write('\u001B[104;17u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol capsLock', async t => {
	const ps = term('use-input-kitty', ['capsLock']);
	// 'a' with capsLock (modifier 65 = capsLock(64) + 1)
	ps.write('\u001B[97;65u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol numLock', async t => {
	const ps = term('use-input-kitty', ['numLock']);
	// 'a' with numLock (modifier 129 = numLock(128) + 1)
	ps.write('\u001B[97;129u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol super+ctrl', async t => {
	const ps = term('use-input-kitty', ['superCtrl']);
	// 's' with super+ctrl (modifier 13 = super(8) + ctrl(4) + 1)
	ps.write('\u001B[115;13u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol press event', async t => {
	const ps = term('use-input-kitty', ['press']);
	// 'a' press event (eventType 1 = press)
	ps.write('\u001B[97;1:1u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol repeat event', async t => {
	const ps = term('use-input-kitty', ['repeat']);
	// 'a' repeat event (eventType 2 = repeat)
	ps.write('\u001B[97;1:2u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol release event', async t => {
	const ps = term('use-input-kitty', ['release']);
	// 'a' release event (eventType 3 = release)
	ps.write('\u001B[97;1:3u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle kitty protocol escape key', async t => {
	const ps = term('use-input-kitty', ['escapeKitty']);
	// Escape key
	ps.write('\u001B[27u');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - non-printable kitty key (capslock) produces empty input',
	async t => {
		const ps = term('use-input-kitty', ['nonPrintable']);
		// Capslock (codepoint 57358)
		ps.write('\u001B[57358u');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'useInput - non-printable kitty key (f13) produces empty input',
	async t => {
		const ps = term('use-input-kitty', ['nonPrintable']);
		// F13 (codepoint 57376)
		ps.write('\u001B[57376u');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'useInput - non-printable kitty key (printscreen) produces empty input',
	async t => {
		const ps = term('use-input-kitty', ['nonPrintable']);
		// PrintScreen (codepoint 57361)
		ps.write('\u001B[57361u');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'useInput - kitty protocol space key produces space input',
	async t => {
		const ps = term('use-input-kitty', ['space']);
		// Space key (codepoint 32)
		ps.write('\u001B[32u');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'useInput - kitty protocol return key produces carriage return input',
	async t => {
		const ps = term('use-input-kitty', ['returnKey']);
		// Return key (codepoint 13)
		ps.write('\u001B[13u');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'useInput - kitty protocol ctrl+letter via codepoint 1-26 produces input',
	async t => {
		const ps = term('use-input-kitty', ['ctrlLetter']);
		// Ctrl+a via codepoint 1 form (modifier 5 = ctrl(4) + 1)
		ps.write('\u001B[1;5u');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);
