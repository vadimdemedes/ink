import test, {type TestContext} from 'node:test';
import React from 'react';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import logUpdate from '../src/log-update.js';
import {Text, render, useCursor} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

for (const isIncrementalRendering of [false, true]) {
	test(`unmount returns a positioned cursor below the frame (incremental: ${isIncrementalRendering})`, async (t: TestContext) => {
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
			incrementalRendering: isIncrementalRendering,
			patchConsole: false,
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		instance.unmount();
		await instance.waitUntilExit();

		const output = stdout.getWrites().join('') + '$ command';
		const lines = reconstructTerminalLines(output.replaceAll('\n', '\r\n'), 10);
		t.assert.deepStrictEqual(lines.slice(0, 3), [
			'Header',
			'Footer',
			'$ command',
		]);
	});

	test(`done returns the cursor once without erasing output (incremental: ${isIncrementalRendering})`, (t: TestContext) => {
		const stdout = createStdout();
		const update = logUpdate.create(stdout, {
			showCursor: true,
			incremental: isIncrementalRendering,
		});
		update.setCursorPosition({x: 2, y: 0});
		update('Header\nFooter\n');
		const beforeDone = stdout.getWrites().length;
		update.done();
		t.assert.deepStrictEqual(stdout.getWrites().slice(beforeDone), [
			ansiEscapes.cursorDown(2) + ansiEscapes.cursorTo(0),
		]);
		update.done();
		t.assert.strictEqual(stdout.getWrites().length, beforeDone + 1);
	});

	test(`alternate-screen exit does not reposition the primary cursor (incremental: ${isIncrementalRendering})`, async (t: TestContext) => {
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
			incrementalRendering: isIncrementalRendering,
			alternateScreen: true,
			patchConsole: false,
		});
		t.after(() => {
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
		t.assert.ok(output.includes(ansiEscapes.exitAlternativeScreen));
		// Showing the cursor is allowed after restoring the primary screen, but moving it is not.
		t.assert.strictEqual(restoredScreen, ansiEscapes.cursorShow);
		t.assert.strictEqual(stripAnsi(restoredScreen), '');
	});
}
