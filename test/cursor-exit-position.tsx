import React from 'react';
import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import logUpdate from '../src/log-update.js';
import {Text, render, useCursor} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

for (const incrementalRendering of [false, true]) {
	test(`unmount returns a positioned cursor below the frame (incremental: ${incrementalRendering})`, async t => {
		const stdout = createStdout();
		stdout.rows = 10;
		function Example() {
			const {setCursorPosition} = useCursor();
			setCursorPosition({x: 2, y: 0});
			return <Text>{'Header\nFooter'}</Text>;
		}

		const instance = render(<Example />, {
			stdout,
			interactive: true,
			incrementalRendering,
			patchConsole: false,
		});
		t.teardown(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		instance.unmount();
		await instance.waitUntilExit();

		const output = stdout.getWrites().join('') + '$ command';
		const lines = reconstructTerminalLines(output.replaceAll('\n', '\r\n'), 10);
		t.deepEqual(lines.slice(0, 3), ['Header', 'Footer', '$ command']);
	});

	test(`done returns the cursor once without erasing output (incremental: ${incrementalRendering})`, t => {
		const stdout = createStdout();
		const update = logUpdate.create(stdout, {
			showCursor: true,
			incremental: incrementalRendering,
		});
		update.setCursorPosition({x: 2, y: 0});
		update('Header\nFooter\n');
		const beforeDone = stdout.getWrites().length;
		update.done();
		t.deepEqual(stdout.getWrites().slice(beforeDone), [
			ansiEscapes.cursorDown(2) + ansiEscapes.cursorTo(0),
		]);
		update.done();
		t.is(stdout.getWrites().length, beforeDone + 1);
	});

	test(`alternate-screen exit does not reposition the primary cursor (incremental: ${incrementalRendering})`, async t => {
		const stdout = createStdout();
		stdout.rows = 10;
		function Example() {
			const {setCursorPosition} = useCursor();
			setCursorPosition({x: 2, y: 0});
			return <Text>{'Header\nFooter'}</Text>;
		}

		const instance = render(<Example />, {
			stdout,
			interactive: true,
			incrementalRendering,
			alternateScreen: true,
			patchConsole: false,
		});
		t.teardown(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		instance.unmount();
		await instance.waitUntilExit();
		const output = stdout.getWrites().join('');
		const restoredScreen = output.slice(
			output.indexOf(ansiEscapes.exitAlternativeScreen) +
				ansiEscapes.exitAlternativeScreen.length,
		);
		t.true(output.includes(ansiEscapes.exitAlternativeScreen));
		// Showing the cursor is allowed after restoring the primary screen, but moving it is not.
		t.is(restoredScreen, ansiEscapes.cursorShow);
		t.is(stripAnsi(restoredScreen), '');
	});
}
