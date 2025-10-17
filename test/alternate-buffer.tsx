/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'ava';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import {run} from './helpers/run.js';

const enterSynchronizedOutput = '\u001B[[?2026h';
const exitSynchronizedOutput = '\u001B[?2026l';

const scenarios: Array<{
	name: string;
	env: Record<string, string>;
	eraseOperation: string;
}> = [
	{
		name: 'non-iTerm',
		env: {},
		eraseOperation: ansiEscapes.eraseScreen,
	},
	{
		name: 'iTerm',
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {TERM_PROGRAM: 'iTerm.app'},
		eraseOperation: ansiEscapes.clearTerminal,
	},
];

for (const {name, env, eraseOperation} of scenarios) {
	test(`(${name}) renders in alternate buffer and leaves it on exit`, async t => {
		const output = await run('alternate-buffer', {
			env,
		});

		t.true(
			output.includes(ansiEscapes.enterAlternativeScreen),
			'Should enter alternate screen',
		);
		t.true(
			output.includes(ansiEscapes.exitAlternativeScreen),
			'Should exit alternate screen',
		);
		t.true(
			output.includes(ansiEscapes.cursorTo(0, 0)),
			'Should move cursor to top-left',
		);
		t.true(output.includes(eraseOperation), 'Should erase screen');
		t.true(output.includes('Hello World'), 'Should render content');
	});
}

test('does not use alternate buffer when disabled', async t => {
	const output = await run('alternate-buffer-off');

	t.false(output.includes(ansiEscapes.enterAlternativeScreen));
	t.false(output.includes(ansiEscapes.exitAlternativeScreen));
	t.false(output.includes(enterSynchronizedOutput));
	t.false(output.includes(exitSynchronizedOutput));
	t.true(output.includes('Hello World'));
});

for (const {name, env} of scenarios) {
	test(`(${name}) renders final frame on exit outside of alternate buffer`, async t => {
		const output = await run('alternate-buffer', {env});

		const finalOutput = output.slice(
			output.indexOf(ansiEscapes.exitAlternativeScreen) +
				ansiEscapes.exitAlternativeScreen.length,
		);

		t.true(finalOutput.includes('Hello World'));
	});

	test(`(${name}) does not render more lines than terminal height until exit`, async t => {
		const output = await run('alternate-buffer-long', {rows: 3, env});

		const alternateBufferOutput: string = stripAnsi(
			output.slice(
				output.indexOf(ansiEscapes.enterAlternativeScreen),
				output.indexOf(ansiEscapes.exitAlternativeScreen),
			),
		);

		const alternateBufferLines = alternateBufferOutput
			.split(/\r?\n/)
			.filter(line => line.trim());

		t.deepEqual(alternateBufferLines, ['Line 3', 'Line 4', 'Line 5']);

		const outputAfterExit: string = stripAnsi(
			output.slice(output.indexOf(ansiEscapes.exitAlternativeScreen)),
		);

		const linesAfterExit = outputAfterExit
			.split(/\r?\n/)
			.filter(line => line.trim());
		t.deepEqual(linesAfterExit, [
			'Line 1',
			'Line 2',
			'Line 3',
			'Line 4',
			'Line 5',
		]);
	});
}
