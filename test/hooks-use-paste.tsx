import test, {type TestContext} from 'node:test';
import term from './helpers/term.js';

test('usePaste - receives bracketed paste as single text blob', async (t: TestContext) => {
	const ps = term('use-paste', ['basic']);
	ps.write('\u{1B}[200~hello world\u{1B}[201~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
	t.assert.ok(
		ps.output.includes('\u{1B}[?2004h'),
		'bracketed paste mode was enabled',
	);
	t.assert.ok(
		ps.output.includes('\u{1B}[?2004l'),
		'bracketed paste mode was disabled on exit',
	);
});

test('usePaste - paste content with escape sequences is delivered verbatim', async (t: TestContext) => {
	const ps = term('use-paste', ['escapeSequences']);
	ps.write('\u{1B}[200~hello\u{1B}[Aworld\u{1B}[201~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('usePaste - useInput does not receive bracketed paste content', async (t: TestContext) => {
	const ps = term('use-paste', ['noUseInput']);
	ps.write('\u{1B}[200~hello\u{1B}[201~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});

test('usePaste - multiple simultaneous hooks both receive the same paste event', async (t: TestContext) => {
	const ps = term('use-paste', ['multipleHooks']);
	ps.write('\u{1B}[200~hello\u{1B}[201~');
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('exited'));
});
