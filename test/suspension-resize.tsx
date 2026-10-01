import test, {type TestContext} from 'node:test';
import React, {useLayoutEffect} from 'react';
import {render, useApp, Text} from '../src/index.js';
import {type SuspendTerminal} from '../src/components/AppContext.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

for (const columns of [80, 120]) {
	test(`resize to ${columns} columns does not write while suspended`, async (t: TestContext) => {
		const stdout = createStdout(100);
		let suspendTerminal!: SuspendTerminal;

		function Example() {
			const app = useApp();
			useLayoutEffect(() => {
				suspendTerminal = app.suspendTerminal;
			}, [app.suspendTerminal]);
			return <Text>hello</Text>;
		}

		const instance = render(<Example />, {
			stdout,
			stdin: createStdin(),
			interactive: true,
			patchConsole: false,
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		const suspension = await suspendTerminal();
		const before = stdout.getWrites().length;
		stdout.columns = columns;
		stdout.emit('resize');
		t.assert.deepStrictEqual(
			stdout.getWrites().slice(before).filter(Boolean),
			[],
		);

		await suspension.resume();
		t.assert.ok(
			stdout
				.getWrites()
				.slice(before)
				.some(write => write.includes('hello')),
		);
	});
}
