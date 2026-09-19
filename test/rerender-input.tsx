import React from 'react';
import test from 'ava';
import FakeTimers from '@sinonjs/fake-timers';
import {render, useInput, usePaste, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';

test('rerender() keeps a pending Escape keypress', async t => {
	const clock = FakeTimers.install({
		toFake: ['setTimeout', 'clearTimeout'],
	});

	try {
		const stdin = createStdin();
		const stdout = createStdout();
		const keys: string[] = [];
		function Example({label}: {readonly label: string}) {
			useInput((_input, key) => {
				keys.push(key.escape ? 'escape' : 'other');
			});
			return <Text>{label}</Text>;
		}

		const app = render(<Example label="a" />, {
			stdin,
			stdout,
			interactive: true,
		});
		t.teardown(app.unmount);
		emitReadable(stdin, '\u001B');
		app.rerender(<Example label="b" />);
		await clock.tickAsync(20);
		t.deepEqual(keys, ['escape']);
	} finally {
		clock.uninstall();
	}
});

test('rerender() keeps an escape sequence that spans two reads', t => {
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
	emitReadable(stdin, '\u001B[');
	app.rerender(<Example label="b" />);
	emitReadable(stdin, 'A');
	t.deepEqual(keys, [{input: '', upArrow: true, shift: false}]);
});

test('rerender() keeps a bracketed paste that spans two reads', t => {
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
	emitReadable(stdin, '\u001B[200~part1');
	app.rerender(<Example label="b" />);
	emitReadable(stdin, 'part2\u001B[201~');
	t.deepEqual(pastes, ['part1part2']);
	t.deepEqual(inputs, []);
});

test('rerender() does not detach and reattach the stdin readable listener', t => {
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
	app.rerender(<Example label="b" />);
	t.is(removed, 0);
});
