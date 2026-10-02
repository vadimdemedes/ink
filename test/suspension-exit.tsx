import test, {type TestContext} from 'node:test';
import React, {useLayoutEffect} from 'react';
import {type SinonStub} from 'sinon';
import {render, Text, useApp, useInput} from '../src/index.js';
import {type SuspendTerminal} from '../src/components/AppContext.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

for (const shouldUseCallback of [false, true]) {
	test(`resuming after unmount does not re-enable terminal input (callback: ${shouldUseCallback})`, async (t: TestContext) => {
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
		if (shouldUseCallback) {
			await suspendTerminal(async () => {
				instance.unmount();
				await instance.waitUntilExit();
			});
		} else {
			const suspension = await suspendTerminal();
			instance.unmount();
			await instance.waitUntilExit();
			await suspension.resume();
		}

		t.assert.strictEqual(
			(stdin.setRawMode as SinonStub).lastCall.args[0],
			false,
		);
		t.assert.strictEqual(stdin.listenerCount('readable'), 0);
	});
}
