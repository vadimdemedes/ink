import test from 'ava';
import term from './helpers/term.js';

test.serial('useInput - handle up arrow', async t => {
	const ps = term('use-input', ['upArrow']);
	ps.write('\u001B[A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle down arrow', async t => {
	const ps = term('use-input', ['downArrow']);
	ps.write('\u001B[B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle left arrow', async t => {
	const ps = term('use-input', ['leftArrow']);
	ps.write('\u001B[D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle right arrow', async t => {
	const ps = term('use-input', ['rightArrow']);
	ps.write('\u001B[C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - handles rapid arrows and enter in one chunk',
	async t => {
		const ps = term('use-input', ['rapidArrowsEnter']);
		ps.write('\u001B[B\u001B[B\u001B[B\r');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - handle meta + up arrow', async t => {
	const ps = term('use-input', ['upArrowMeta']);
	ps.write('\u001B\u001B[A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + down arrow', async t => {
	const ps = term('use-input', ['downArrowMeta']);
	ps.write('\u001B\u001B[B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + left arrow', async t => {
	const ps = term('use-input', ['leftArrowMeta']);
	ps.write('\u001B\u001B[D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + right arrow', async t => {
	const ps = term('use-input', ['rightArrowMeta']);
	ps.write('\u001B\u001B[C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + up arrow', async t => {
	const ps = term('use-input', ['upArrowCtrl']);
	ps.write('\u001B[1;5A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + down arrow', async t => {
	const ps = term('use-input', ['downArrowCtrl']);
	ps.write('\u001B[1;5B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + left arrow', async t => {
	const ps = term('use-input', ['leftArrowCtrl']);
	ps.write('\u001B[1;5D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + right arrow', async t => {
	const ps = term('use-input', ['rightArrowCtrl']);
	ps.write('\u001B[1;5C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle page down', async t => {
	const ps = term('use-input', ['pageDown']);
	ps.write('\u001B[6~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle page up', async t => {
	const ps = term('use-input', ['pageUp']);
	ps.write('\u001B[5~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle home', async t => {
	const ps = term('use-input', ['home']);
	ps.write('\u001B[H');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle end', async t => {
	const ps = term('use-input', ['end']);
	ps.write('\u001B[F');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});
