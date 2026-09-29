import React from 'react';
import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import {Box, Text, render} from '../src/index.js';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

test('incremental rendering preserves the screen across shortened and grown suffixes', t => {
	const stdout = createStdout();
	const update = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});
	for (const value of ['1000', '1', '200', '']) {
		update(`UNCHANGED LEFT | ${value}\nfooter\n`);
		const screen = reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			10,
		);
		t.deepEqual(screen.slice(0, 2), [
			`UNCHANGED LEFT | ${value}`.trimEnd(),
			'footer',
		]);
	}

	for (const output of stdout.getWrites().slice(1)) {
		t.false(output.includes('UNCHANGED LEFT'));
		t.true(output.includes(ansiEscapes.eraseEndLine));
	}
});

test('falls back after a width change or a frame height change', t => {
	const stdout = createStdout(80);
	const update = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});
	update('unchanged 0\n');
	stdout.columns = 100;
	update('unchanged 1\n');
	t.true(stdout.get().includes('unchanged 1'));
	update('unchanged 2\nextra\n');
	t.true(stdout.get().includes('unchanged 2'));
	update('unchanged 3\n');
	t.true(stdout.get().includes('unchanged 3'));
});

for (const operation of ['clear', 'reset', 'done'] as const) {
	test(`${operation} invalidates the prefix baseline`, t => {
		const stdout = createStdout();
		const update = logUpdate.create(stdout, {
			showCursor: true,
			incremental: true,
		});
		update('unchanged 0\n');
		update[operation]();
		update('unchanged 1\n');
		t.true(stdout.get().includes('unchanged 1'));
	});
}

test('sync establishes the prefix baseline for the next frame', t => {
	const stdout = createStdout();
	const update = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});
	update.sync('unchanged 0\n');
	update('unchanged 1\n');
	t.is(
		stdout.get(),
		ansiEscapes.cursorUp(1) +
			ansiEscapes.cursorTo(10) +
			'1' +
			ansiEscapes.eraseEndLine +
			'\n',
	);
});

test('column updates preserve explicit cursor positioning without a trailing newline', t => {
	const stdout = createStdout();
	const update = logUpdate.create(stdout, {
		showCursor: true,
		incremental: true,
	});
	update.setCursorPosition({x: 2, y: 0});
	update('unchanged 0\nfooter');
	update.setCursorPosition({x: 2, y: 0});
	update('unchanged 1\nfooter');
	t.false(stdout.get().includes('unchanged'));
	t.true(
		stdout
			.get()
			.endsWith(
				ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(2) + '\u001B[?25h',
			),
	);
	t.deepEqual(update.getCursorPosition(), {x: 2, y: 0});
});

test('side-by-side public components do not rewrite the unchanged left region', async t => {
	const stdout = createStdout(60);
	stdout.rows = 24;
	const frame = (count: number) => (
		<Box width={50} height={4}>
			<Box width={20}>
				<Text>UNCHANGED LEFT</Text>
			</Box>
			<Text>Counter: {count}</Text>
		</Box>
	);
	const instance = render(frame(0), {
		stdout,
		interactive: true,
		incrementalRendering: true,
		alternateScreen: true,
		patchConsole: false,
	});
	t.teardown(() => {
		instance.unmount();
		instance.cleanup();
	});
	await instance.waitUntilRenderFlush();
	for (const count of [1, 2, 3]) {
		const before = stdout.getWrites().length;
		instance.rerender(frame(count));
		// Each assertion must observe a distinct completed terminal frame.
		// eslint-disable-next-line no-await-in-loop
		await instance.waitUntilRenderFlush();
		const output = stdout.getWrites().slice(before).join('');
		t.false(output.includes('UNCHANGED LEFT'));
		t.true(output.includes(ansiEscapes.cursorTo(29) + String(count)));
	}
});
