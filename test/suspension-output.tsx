import React, {useLayoutEffect} from 'react';
import test from 'ava';
import {render, useApp, useStdout, useStderr, Text} from '../src/index.js';
import {type SuspendTerminal} from '../src/components/AppContext.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

test('non-interactive suspension keeps the latest rendered frame', async t => {
	const stdout = createStdout();
	let suspendTerminal!: SuspendTerminal;

	function Example({text}: {readonly text: string}) {
		const app = useApp();
		useLayoutEffect(() => {
			suspendTerminal = app.suspendTerminal;
		}, [app.suspendTerminal]);
		return <Text>{text}</Text>;
	}

	const instance = render(<Example text="before" />, {
		stdout,
		stdin: createStdin(),
		interactive: false,
		patchConsole: false,
	});
	t.teardown(() => {
		instance.unmount();
	});
	await instance.waitUntilRenderFlush();
	await suspendTerminal(async () => {
		instance.rerender(<Example text="after" />);
		await instance.waitUntilRenderFlush();
	});
	instance.unmount();
	await instance.waitUntilExit();
	t.is(stdout.get(), 'after\n');
});

for (const stream of ['stdout', 'stderr'] as const) {
	test(`non-interactive suspension preserves ${stream} writes`, async t => {
		const stdout = createStdout();
		const stderr = createStdout();
		let suspendTerminal!: SuspendTerminal;
		let write!: (text: string) => void;

		function Example() {
			const app = useApp();
			const output = useStdout();
			const error = useStderr();
			useLayoutEffect(() => {
				suspendTerminal = app.suspendTerminal;
				write = stream === 'stdout' ? output.write : error.write;
			}, [app.suspendTerminal, output.write, error.write]);
			return <Text>frame</Text>;
		}

		const instance = render(<Example />, {
			stdout,
			stderr,
			stdin: createStdin(),
			interactive: false,
			patchConsole: false,
		});
		t.teardown(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();
		await suspendTerminal(async () => {
			write('child result\n');
		});
		t.true(
			(stream === 'stdout' ? stdout : stderr)
				.getWrites()
				.includes('child result\n'),
		);
	});
}
