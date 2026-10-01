import test, {type TestContext} from 'node:test';
import React, {useLayoutEffect} from 'react';
import {type SinonStub} from 'sinon';
import {render, Text, useApp, useInput} from '../src/index.js';
import {type SuspendTerminal} from '../src/components/AppContext.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

for (const shouldDisposeFirst of [false, true]) {
	test(`an old suspension cannot resume a later suspension (dispose first: ${shouldDisposeFirst})`, async (t: TestContext) => {
		const stdout = createStdout();
		const stdin = createStdin();
		let suspendTerminal!: SuspendTerminal;

		function Example() {
			const app = useApp();
			useInput(() => {});
			useLayoutEffect(() => {
				suspendTerminal = app.suspendTerminal;
			}, [app.suspendTerminal]);
			return <Text>hello</Text>;
		}

		const instance = render(<Example />, {
			stdout,
			stdin,
			interactive: true,
			patchConsole: false,
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		const first = await suspendTerminal();
		await (shouldDisposeFirst ? first[Symbol.asyncDispose]() : first.resume());
		const second = await suspendTerminal();
		await first.resume();
		await first[Symbol.asyncDispose]();
		t.assert.strictEqual(
			(stdin.setRawMode as SinonStub).lastCall.args[0],
			false,
		);
		await second.resume();
		t.assert.strictEqual(
			(stdin.setRawMode as SinonStub).lastCall.args[0],
			true,
		);
	});
}
