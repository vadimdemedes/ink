import FakeTimers from '@sinonjs/fake-timers';
import test from 'ava';
import React from 'react';
import stripAnsi from 'strip-ansi';
import {render, flush, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

function TestComponent({text}: {readonly text: string}) {
	return <Text>{text}</Text>;
}

test.serial('flush forces pending throttled renders', async t => {
	const clock = FakeTimers.install();
	try {
		const stdout = createStdout();

		const {rerender, unmount} = render(<TestComponent text="Hello" />, {
			stdout,
			maxFps: 1, // 1 Hz => ~1000 ms throttle window
		});

		// Initial render (leading call)
		t.is((stdout.write as any).callCount, 1);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'Hello\n',
		);

		// Trigger another render inside the throttle window
		rerender(<TestComponent text="World" />);
		// Not rendered yet due to throttling
		t.is((stdout.write as any).callCount, 1);

		// Flush should force the pending render
		await flush(stdout as unknown as NodeJS.WriteStream);

		// Now we should see the second render
		t.is((stdout.write as any).callCount, 2);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'World\n',
		);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('flush on instance forces pending throttled renders', async t => {
	const clock = FakeTimers.install();
	try {
		const stdout = createStdout();

		const {
			rerender,
			unmount,
			flush: instanceFlush,
		} = render(<TestComponent text="Hello" />, {
			stdout,
			maxFps: 1, // 1 Hz => ~1000 ms throttle window
		});

		// Initial render (leading call)
		t.is((stdout.write as any).callCount, 1);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'Hello\n',
		);

		// Trigger another render inside the throttle window
		rerender(<TestComponent text="World" />);
		// Not rendered yet due to throttling
		t.is((stdout.write as any).callCount, 1);

		// Flush on instance should force the pending render
		await instanceFlush();

		// Now we should see the second render
		t.is((stdout.write as any).callCount, 2);
		t.is(
			stripAnsi((stdout.write as any).lastCall.args[0] as string),
			'World\n',
		);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test.serial('flush resolves when no pending renders', async t => {
	const stdout = createStdout();

	const {unmount} = render(<TestComponent text="Hello" />, {
		stdout,
		debug: true, // Debug mode has no throttling
	});

	// Should resolve without error even if no pending renders
	await t.notThrowsAsync(async () => {
		await flush(stdout as unknown as NodeJS.WriteStream);
	});

	unmount();
});

test.serial('flush with no instance resolves immediately', async t => {
	const stdout = createStdout();

	// No render was done, so no instance exists for this stdout
	await t.notThrowsAsync(async () => {
		await flush(stdout as unknown as NodeJS.WriteStream);
	});
});
