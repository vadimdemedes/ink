import test, {type TestContext} from 'node:test';
import React from 'react';
import FakeTimers from '@sinonjs/fake-timers';
import {render, useInput, usePaste, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';

test('rerender() keeps a pending Escape keypress', async (t: TestContext) => {
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
		t.after(() => {
			app.unmount();
		});
		emitReadable(stdin, '\u{1B}');
		app.rerender(<Example label="b" />);
		await clock.tickAsync(20);
		t.assert.deepStrictEqual(keys, ['escape']);
	} finally {
		clock.uninstall();
	}
});

test('rerender() keeps an escape sequence that spans two reads', (t: TestContext) => {
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
	t.after(() => {
		app.unmount();
	});
	emitReadable(stdin, '\u{1B}[');
	app.rerender(<Example label="b" />);
	emitReadable(stdin, 'A');
	t.assert.deepStrictEqual(keys, [{input: '', upArrow: true, shift: false}]);
});

test('rerender() keeps a bracketed paste that spans two reads', (t: TestContext) => {
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
	t.after(() => {
		app.unmount();
	});
	emitReadable(stdin, '\u{1B}[200~part1');
	app.rerender(<Example label="b" />);
	emitReadable(stdin, 'part2\u{1B}[201~');
	t.assert.deepStrictEqual(pastes, ['part1part2']);
	t.assert.deepStrictEqual(inputs, []);
});

test('rerender() does not detach and reattach the stdin readable listener', (t: TestContext) => {
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
	t.after(() => {
		app.unmount();
	});
	app.rerender(<Example label="b" />);
	t.assert.strictEqual(removed, 0);
});
