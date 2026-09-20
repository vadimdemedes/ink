import React, {useLayoutEffect} from 'react';
import test from 'ava';
import {type SinonStub} from 'sinon';
import {render, Text, useApp, useInput} from '../src/index.js';
import {type SuspendTerminal} from '../src/components/AppContext.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

for (const disposeFirst of [false, true]) {
	test(`an old suspension cannot resume a later suspension (dispose first: ${disposeFirst})`, async t => {
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
		t.teardown(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		const first = await suspendTerminal();
		await (disposeFirst ? first[Symbol.asyncDispose]() : first.resume());
		const second = await suspendTerminal();
		await first.resume();
		await first[Symbol.asyncDispose]();
		t.false((stdin.setRawMode as SinonStub).lastCall.args[0]);
		await second.resume();
		t.true((stdin.setRawMode as SinonStub).lastCall.args[0]);
	});
}
