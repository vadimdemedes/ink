import test, {type TestContext} from 'node:test';
import React from 'react';
import {Box, Text, Static, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

for (const height of [0, 1, 2]) {
	test(`runtime Static preserves ${height} blank rows in debug output`, async (t: TestContext) => {
		const stdout = createStdout();
		const instance = render(
			<>
				<Static items={['blank']}>
					{item => <Box key={item} height={height} />}
				</Static>
				<Text>after</Text>
			</>,
			{stdout, debug: true, patchConsole: false},
		);
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		t.assert.strictEqual(stdout.get(), '\n'.repeat(height) + 'after');
	});

	test(`runtime Static preserves ${height} blank rows in non-interactive output`, async (t: TestContext) => {
		const stdout = createStdout(100, false);
		const instance = render(
			<>
				<Static items={['blank']}>
					{item => <Box key={item} height={height} />}
				</Static>
				<Text>after</Text>
			</>,
			{stdout, interactive: false, patchConsole: false},
		);
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		instance.unmount();
		await instance.waitUntilExit();

		t.assert.strictEqual(
			stdout.getWrites().join(''),
			'\n'.repeat(height) + 'after\n',
		);
	});
}

for (const isIncrementalRendering of [false, true]) {
	test(`a blank Static append survives a later live update (incremental: ${isIncrementalRendering})`, async (t: TestContext) => {
		const stdout = createStdout(100, true);
		stdout.rows = 8;
		const view = (items: string[], label: string) => (
			<>
				<Static items={items}>
					{item =>
						item === 'blank' ? (
							<Box key={item} height={1} />
						) : (
							<Text key={item}>{item}</Text>
						)
					}
				</Static>
				<Text>{label}</Text>
			</>
		);
		const instance = render(view(['first'], 'live'), {
			stdout,
			interactive: true,
			incrementalRendering: isIncrementalRendering,
			patchConsole: false,
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		instance.rerender(view(['first', 'blank'], 'live'));
		await instance.waitUntilRenderFlush();
		instance.rerender(view(['first', 'blank', 'last'], 'live'));
		await instance.waitUntilRenderFlush();
		instance.rerender(view(['first', 'blank', 'last'], 'updated'));
		await instance.waitUntilRenderFlush();

		const lines = reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			8,
		);
		t.assert.deepStrictEqual(lines.slice(0, 4), [
			'first',
			'',
			'last',
			'updated',
		]);
	});
}
