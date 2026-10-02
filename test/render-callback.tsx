import test, {type TestContext} from 'node:test';
import React from 'react';
import {render, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

for (const mode of [
	{incrementalRendering: false},
	{incrementalRendering: true},
	{debug: true},
	{isScreenReaderEnabled: true},
]) {
	test(`onRender observes the committed frame (${JSON.stringify(mode)})`, async (t: TestContext) => {
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
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		t.assert.ok(observedFrames[0]?.includes('first'));

		instance.rerender(<Text>second</Text>);
		await instance.waitUntilRenderFlush();
		t.assert.ok(observedFrames.at(-1)?.includes('second'));
	});
}
