import test from 'ava';
import term from './helpers/term.js';

test.serial(
	'usePaste - receives bracketed paste as single text blob',
	async t => {
		const ps = term('use-paste', ['basic']);
		ps.write('\u001B[200~hello world\u001B[201~');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
		t.true(
			ps.output.includes('\u001B[?2004h'),
			'bracketed paste mode was enabled',
		);
		t.true(
			ps.output.includes('\u001B[?2004l'),
			'bracketed paste mode was disabled on exit',
		);
	},
);

test.serial(
	'usePaste - paste content with escape sequences is delivered verbatim',
	async t => {
		const ps = term('use-paste', ['escapeSequences']);
		ps.write('\u001B[200~hello\u001B[Aworld\u001B[201~');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'usePaste - useInput does not receive bracketed paste content',
	async t => {
		const ps = term('use-paste', ['noUseInput']);
		ps.write('\u001B[200~hello\u001B[201~');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'usePaste - multiple simultaneous hooks both receive the same paste event',
	async t => {
		const ps = term('use-paste', ['multipleHooks']);
		ps.write('\u001B[200~hello\u001B[201~');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);
