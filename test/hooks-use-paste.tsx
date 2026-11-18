import test, {type TestContext} from 'node:test';
import React from 'react';
import {render, usePaste} from '../src/index.js';
import term from './helpers/term.js';
import createStdout, {type FakeStdout} from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';
import {act} from './helpers/act.js';

const enableBracketedPaste = '\u{1B}[?2004h';
const disableBracketedPaste = '\u{1B}[?2004l';

const bracketedPasteWrites = (stdout: FakeStdout): string[] =>
	stdout.getWrites().filter(write => write.includes('\u{1B}[?2004'));

function PasteHook() {
	usePaste(() => {});
	return null;
}

function PasteHooks({count}: {readonly count: number}) {
	return Array.from({length: count}, (_, index) => <PasteHook key={index} />);
}

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

test('usePaste - bracketed paste mode stays enabled until the last hook unmounts', async (t: TestContext) => {
	const stdout = createStdout();
	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<PasteHooks count={2} />, {
			stdin: createStdin(),
			stdout,
			interactive: true,
			patchConsole: false,
		});
	});
	t.after(() => {
		instance.unmount();
	});

	t.assert.deepStrictEqual(bracketedPasteWrites(stdout), [
		enableBracketedPaste,
	]);

	await act(async () => {
		instance.rerender(<PasteHooks count={1} />);
	});

	t.assert.deepStrictEqual(bracketedPasteWrites(stdout), [
		enableBracketedPaste,
	]);

	await act(async () => {
		instance.rerender(<PasteHooks count={0} />);
	});

	t.assert.deepStrictEqual(bracketedPasteWrites(stdout), [
		enableBracketedPaste,
		disableBracketedPaste,
	]);
});

test('usePaste - does not write bracketed paste mode sequences when stdout is not a TTY', async (t: TestContext) => {
	const stdout = createStdout(100, false);
	let instance!: ReturnType<typeof render>;
	await act(async () => {
		instance = render(<PasteHooks count={1} />, {
			stdin: createStdin(),
			stdout,
			patchConsole: false,
		});
	});
	t.after(() => {
		instance.unmount();
	});

	await act(async () => {
		instance.rerender(<PasteHooks count={0} />);
	});

	t.assert.deepStrictEqual(bracketedPasteWrites(stdout), []);
});
