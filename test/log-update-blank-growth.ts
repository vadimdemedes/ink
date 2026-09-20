import React from 'react';
import test from 'ava';
import {Box, Text, render} from '../src/index.js';
import logUpdate from '../src/log-update.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

for (const rows of [4, 6, 10]) {
	test(`incremental blank-line growth preserves history in a ${rows}-row terminal`, t => {
		const stdout = createStdout();
		const update = logUpdate.create(stdout, {
			showCursor: true,
			incremental: true,
		});
		const writes = ['history1\nhistory2\nhistory3\n'];
		for (const frame of ['A\n', 'A\n\n', 'B\n\n']) {
			update(frame);
			writes.push(stdout.get());
		}

		const lines = reconstructTerminalLines(
			writes.join('').replaceAll('\n', '\r\n'),
			rows,
		);
		t.deepEqual(lines.slice(0, 4), ['history1', 'history2', 'history3', 'B']);
		t.true(lines.slice(4).every(line => line === ''));
	});
}

test('growing a rendered Box with an empty row preserves terminal history', async t => {
	const stdout = createStdout();
	stdout.rows = 4;
	const frame = (height: number, text: string) =>
		React.createElement(Box, {height}, React.createElement(Text, {}, text));
	const instance = render(frame(1, 'A'), {
		stdout,
		interactive: true,
		incrementalRendering: true,
		patchConsole: false,
	});
	t.teardown(() => {
		instance.unmount();
	});
	await instance.waitUntilRenderFlush();
	instance.rerender(frame(2, 'A'));
	await instance.waitUntilRenderFlush();
	instance.rerender(frame(2, 'B'));
	await instance.waitUntilRenderFlush();

	const output = 'history1\nhistory2\nhistory3\n' + stdout.getWrites().join('');
	t.deepEqual(reconstructTerminalLines(output.replaceAll('\n', '\r\n'), 4), [
		'history1',
		'history2',
		'history3',
		'B',
		'',
		'',
	]);
});
