import {Readable} from 'node:stream';
import {setTimeout as delay} from 'node:timers/promises';
import React from 'react';
import test from 'ava';
import {render, useApp, useInput} from '../src/index.js';
import {resolveFlags} from '../src/kitty-keyboard.js';
import createStdout from './helpers/create-stdout.js';

const createStdin = () =>
	Object.assign(new Readable({read() {}}), {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		isTTY: true,
		setRawMode() {},
	});

test('associated text requests include all-key reporting', t => {
	t.is(resolveFlags(['reportAssociatedText']), 24);
	t.is(resolveFlags(['disambiguateEscapeCodes', 'reportAssociatedText']), 25);
});

test('auto detection consumes responses without duplicating input', async t => {
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
	t.teardown(app.unmount);
	stdin.push('x\u001B[?0u');
	await delay(30);
	t.deepEqual(inputs, ['x']);
	t.true(stdout.getWrites().includes('\u001B[>1u'));
});

test('suspension cancels pending keyboard negotiation', async t => {
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
	t.teardown(app.unmount);
	const suspension = await suspendTerminal();
	const beforeResponse = stdout.getWrites().length;
	stdin.push('\u001B[?0u');
	await delay(30);
	t.deepEqual(stdout.getWrites().slice(beforeResponse), []);
	await suspension.resume();
	t.false(stdout.getWrites().includes('\u001B[>1u'));
});

test('unmount while suspended does not pop the primary keyboard stack', async t => {
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
	t.teardown(app.unmount);
	const suspension = await suspendTerminal();
	app.unmount();
	await suspension.resume();
	t.is(stdout.getWrites().filter(value => value === '\u001B[>1u').length, 1);
	t.is(stdout.getWrites().filter(value => value === '\u001B[<u').length, 1);
});

test('pasted query responses remain input and do not enable the protocol', async t => {
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
	t.teardown(app.unmount);
	stdin.push('\u001B[200~\u001B[?0u\u001B[201~');
	await delay(30);
	t.deepEqual(inputs, ['[?0u']);
	t.false(stdout.getWrites().includes('\u001B[>1u'));
});
