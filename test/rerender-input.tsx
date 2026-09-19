import {Readable} from 'node:stream';
import {setTimeout as delay} from 'node:timers/promises';
import React from 'react';
import test from 'ava';
import {render, useInput, usePaste, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

const createStdin = () =>
	Object.assign(new Readable({read() {}}), {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		isTTY: true,
		setRawMode() {},
	});

test('rerender() keeps a pending Escape keypress', async t => {
	const stdin = createStdin();
	const stdout = createStdout();
	const keys: string[] = [];
	function Example({label}: {readonly label: string}) {
		useInput((_input, key) => {
			keys.push(key.escape ? 'escape' : 'other');
		});
		return <Text>{label}</Text>;
	}

	const app = render(<Example label="a" />, {stdin, stdout, interactive: true});
	t.teardown(app.unmount);
	await delay(5);
	stdin.push('\u001B');
	await delay(2);
	app.rerender(<Example label="b" />);
	await delay(40);
	t.deepEqual(keys, ['escape']);
});

test('rerender() keeps an escape sequence that spans two reads', async t => {
	const stdin = createStdin();
	const stdout = createStdout();
	const keys: Array<{input: string; upArrow: boolean; shift: boolean}> = [];
	function Example({label}: {readonly label: string}) {
		useInput((input, key) => {
			keys.push({input, upArrow: key.upArrow, shift: key.shift});
		});
		return <Text>{label}</Text>;
	}

	const app = render(<Example label="a" />, {stdin, stdout, interactive: true});
	t.teardown(app.unmount);
	await delay(5);
	stdin.push('\u001B[');
	await delay(2);
	app.rerender(<Example label="b" />);
	await delay(2);
	stdin.push('A');
	await delay(40);
	t.deepEqual(keys, [{input: '', upArrow: true, shift: false}]);
});

test('rerender() keeps a bracketed paste that spans two reads', async t => {
	const stdin = createStdin();
	const stdout = createStdout();
	const inputs: string[] = [];
	const pastes: string[] = [];
	function Example({label}: {readonly label: string}) {
		useInput(input => {
			inputs.push(input);
		});
		usePaste(text => {
			pastes.push(text);
		});
		return <Text>{label}</Text>;
	}

	const app = render(<Example label="a" />, {stdin, stdout, interactive: true});
	t.teardown(app.unmount);
	await delay(5);
	stdin.push('\u001B[200~part1');
	await delay(2);
	app.rerender(<Example label="b" />);
	await delay(2);
	stdin.push('part2\u001B[201~');
	await delay(20);
	t.deepEqual(pastes, ['part1part2']);
	t.deepEqual(inputs, []);
});

test('rerender() does not detach and reattach the stdin readable listener', async t => {
	const stdin = createStdin();
	const stdout = createStdout();
	let removed = 0;
	stdin.on('removeListener', event => {
		if (event === 'readable') {
			removed++;
		}
	});

	function Example({label}: {readonly label: string}) {
		useInput(() => {});
		return <Text>{label}</Text>;
	}

	const app = render(<Example label="a" />, {stdin, stdout, interactive: true});
	t.teardown(app.unmount);
	await delay(5);
	app.rerender(<Example label="b" />);
	await delay(5);
	t.is(removed, 0);
});
