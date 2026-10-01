import {Readable} from 'node:stream';
import {setTimeout as delay} from 'node:timers/promises';
import test, {type TestContext} from 'node:test';
import React from 'react';
import {render, useApp, useInput} from '../src/index.js';
import {resolveFlags} from '../src/kitty-keyboard.js';
import createStdout from './helpers/create-stdout.js';

const createStdin = () =>
	Object.assign(new Readable({read() {}}), {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		isTTY: true,
		setRawMode() {},
	});

test('associated text requests include all-key reporting', (t: TestContext) => {
	t.assert.strictEqual(resolveFlags(['reportAssociatedText']), 24);
	t.assert.strictEqual(
		resolveFlags(['disambiguateEscapeCodes', 'reportAssociatedText']),
		25,
	);
});

test('auto detection consumes responses without duplicating input', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	const inputs: string[] = [];
	function Example() {
		useInput(input => {
			inputs.push(input);
		});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
	});
	stdin.push('x\u{1B}[?0u');
	await delay(30);
	t.assert.deepStrictEqual(inputs, ['x']);
	t.assert.ok(stdout.getWrites().includes('\u{1B}[>1u'));
});

test('suspension cancels pending keyboard negotiation', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	let suspendTerminal!: ReturnType<typeof useApp>['suspendTerminal'];
	function Example() {
		suspendTerminal = useApp().suspendTerminal;
		useInput(() => {});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		alternateScreen: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
	});
	const suspension = await suspendTerminal();
	const beforeResponse = stdout.getWrites().length;
	stdin.push('\u{1B}[?0u');
	await delay(30);
	t.assert.deepStrictEqual(stdout.getWrites().slice(beforeResponse), []);
	await suspension.resume();
	t.assert.strictEqual(stdout.getWrites().includes('\u{1B}[>1u'), false);
});

test('unmount while suspended does not pop the primary keyboard stack', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	let suspendTerminal!: ReturnType<typeof useApp>['suspendTerminal'];
	function Example() {
		suspendTerminal = useApp().suspendTerminal;
		useInput(() => {});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		alternateScreen: true,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.after(() => {
		app.unmount();
	});
	const suspension = await suspendTerminal();
	app.unmount();
	await suspension.resume();
	t.assert.strictEqual(
		stdout.getWrites().filter(value => value === '\u{1B}[>1u').length,
		1,
	);
	t.assert.strictEqual(
		stdout.getWrites().filter(value => value === '\u{1B}[<u').length,
		1,
	);
});

test('pasted query responses remain input and do not enable the protocol', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	const inputs: string[] = [];
	function Example() {
		useInput(input => {
			inputs.push(input);
		});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
	});
	stdin.push('\u{1B}[200~\u{1B}[?0u\u{1B}[201~');
	await delay(30);
	t.assert.deepStrictEqual(inputs, ['[?0u']);
	t.assert.strictEqual(stdout.getWrites().includes('\u{1B}[>1u'), false);
});
