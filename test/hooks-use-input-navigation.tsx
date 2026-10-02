import test, {type TestContext} from 'node:test';
import term from './helpers/term.js';

test('useInput - handle up arrow', async (t: TestContext) => {
	const ps = term('use-input', ['upArrow']);
	ps.write('\u{1B}[A');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle down arrow', async (t: TestContext) => {
	const ps = term('use-input', ['downArrow']);
	ps.write('\u{1B}[B');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle left arrow', async (t: TestContext) => {
	const ps = term('use-input', ['leftArrow']);
	ps.write('\u{1B}[D');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle right arrow', async (t: TestContext) => {
	const ps = term('use-input', ['rightArrow']);
	ps.write('\u{1B}[C');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handles rapid arrows and enter in one chunk', async (t: TestContext) => {
	const ps = term('use-input', ['rapidArrowsEnter']);
	ps.write('\u{1B}[B\u{1B}[B\u{1B}[B\r');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta + up arrow', async (t: TestContext) => {
	const ps = term('use-input', ['upArrowMeta']);
	ps.write('\u{1B}\u{1B}[A');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta + down arrow', async (t: TestContext) => {
	const ps = term('use-input', ['downArrowMeta']);
	ps.write('\u{1B}\u{1B}[B');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta + left arrow', async (t: TestContext) => {
	const ps = term('use-input', ['leftArrowMeta']);
	ps.write('\u{1B}\u{1B}[D');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle meta + right arrow', async (t: TestContext) => {
	const ps = term('use-input', ['rightArrowMeta']);
	ps.write('\u{1B}\u{1B}[C');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle ctrl + up arrow', async (t: TestContext) => {
	const ps = term('use-input', ['upArrowCtrl']);
	ps.write('\u{1B}[1;5A');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle SS3 ctrl + up arrow', async (t: TestContext) => {
	const ps = term('use-input', ['upArrowCtrl']);
	ps.write('\u{1B}O1;5A');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle ctrl + down arrow', async (t: TestContext) => {
	const ps = term('use-input', ['downArrowCtrl']);
	ps.write('\u{1B}[1;5B');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle ctrl + left arrow', async (t: TestContext) => {
	const ps = term('use-input', ['leftArrowCtrl']);
	ps.write('\u{1B}[1;5D');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle ctrl + right arrow', async (t: TestContext) => {
	const ps = term('use-input', ['rightArrowCtrl']);
	ps.write('\u{1B}[1;5C');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle page down', async (t: TestContext) => {
	const ps = term('use-input', ['pageDown']);
	ps.write('\u{1B}[6~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle page up', async (t: TestContext) => {
	const ps = term('use-input', ['pageUp']);
	ps.write('\u{1B}[5~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle home', async (t: TestContext) => {
	const ps = term('use-input', ['home']);
	ps.write('\u{1B}[H');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle end', async (t: TestContext) => {
	const ps = term('use-input', ['end']);
	ps.write('\u{1B}[F');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});
