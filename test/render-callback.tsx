import React from 'react';
import test from 'ava';
import {render, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

for (const mode of [
	{incrementalRendering: false},
	{incrementalRendering: true},
	{debug: true},
	{isScreenReaderEnabled: true},
]) {
	test(`onRender observes the committed frame (${JSON.stringify(mode)})`, async t => {
		const stdout = createStdout();
		const observedFrames: string[] = [];
		const instance = render(<Text>first</Text>, {
			stdout,
			interactive: true,
			patchConsole: false,
			...mode,
			onRender() {
				observedFrames.push(stdout.getWrites().join(''));
			},
		});
		t.teardown(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		t.true(observedFrames[0]?.includes('first'));

		instance.rerender(<Text>second</Text>);
		await instance.waitUntilRenderFlush();
		t.true(observedFrames.at(-1)?.includes('second'));
	});
}
