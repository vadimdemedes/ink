import process from 'node:process';
import React from 'react';
import test from 'ava';
import {type SinonStub} from 'sinon';
import {render, useInput, usePaste, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

// The SIGCONT listener is not installed on Windows (the signal doesn't exist
// there), so these tests only make sense on POSIX platforms.
const signalTest =
	process.platform === 'win32' ? test.serial.skip : test.serial;

const delay = async (ms: number) =>
	new Promise(resolve => {
		setTimeout(resolve, ms);
	});

const setRawModeCalls = (stdin: NodeJS.WriteStream): boolean[] => {
	const calls = (stdin.setRawMode as unknown as SinonStub).args;
	return calls.map(args => args[0] as boolean);
};

function InteractiveApp() {
	useInput(() => {});
	return <Text>hello</Text>;
}

function InteractivePasteApp() {
	useInput(() => {});
	usePaste(() => {});
	return <Text>hello</Text>;
}

// When a stopped process (SIGSTOP/SIGTSTP) is continued, a job-control shell
// has typically reset the tty to cooked mode behind Ink's back. Ink must
// reinstate raw mode on SIGCONT. The toggle (false, then true) is required
// because Node caches the tty mode and treats a repeated setRawMode(true) as
// a no-op.
signalTest('SIGCONT reinstates raw mode owned by useInput', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<InteractiveApp />, {
		stdout,
		stdin,
		interactive: true,
	});
	await delay(50);

	const callsBefore = setRawModeCalls(stdin);
	t.deepEqual(callsBefore, [true]);

	process.emit('SIGCONT');
	await delay(50);

	const callsAfter = setRawModeCalls(stdin);
	t.deepEqual(callsAfter, [true, false, true]);

	unmount();
});

signalTest(
	'SIGCONT reinstates bracketed paste, kitty flags, hidden cursor and repaints',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		const {unmount} = render(<InteractivePasteApp />, {
			stdout,
			stdin,
			interactive: true,
			kittyKeyboard: {mode: 'enabled'},
		});
		await delay(50);

		const writeCountBefore = stdout.getWrites().length;

		process.emit('SIGCONT');
		await delay(50);

		const writesAfter = stdout.getWrites().slice(writeCountBefore).join('');

		// Bracketed paste re-enabled for the still-mounted usePaste hook.
		t.true(writesAfter.includes('\u001B[?2004h'));
		// Kitty keyboard flags popped, then re-pushed.
		t.true(writesAfter.includes('\u001B[<u'));
		const kittyPushIndex = writesAfter.search(/\[>\d+u/);
		t.true(kittyPushIndex >= 0);
		t.true(writesAfter.indexOf('\u001B[<u') < kittyPushIndex);
		// The cursor is re-hidden: the shell may have shown it while the process
		// was stopped.
		t.true(writesAfter.includes('\u001B[?25l'));
		// The UI is repainted over whatever the shell drew.
		t.true(writesAfter.includes('hello'));

		unmount();
	},
);

signalTest('SIGCONT does not enable raw mode nobody owns', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	const {unmount} = render(<Text>hello</Text>, {
		stdout,
		stdin,
		interactive: true,
	});
	await delay(50);

	process.emit('SIGCONT');
	await delay(50);

	t.deepEqual(setRawModeCalls(stdin), []);

	unmount();
});

signalTest('SIGCONT listener is removed on unmount', async t => {
	const stdout = createStdout();
	const stdin = createStdin();

	const listenersBefore = process.listenerCount('SIGCONT');

	const {unmount} = render(<InteractiveApp />, {
		stdout,
		stdin,
		interactive: true,
	});
	await delay(50);

	t.is(process.listenerCount('SIGCONT'), listenersBefore + 1);

	unmount();
	await delay(50);

	t.is(process.listenerCount('SIGCONT'), listenersBefore);
});

signalTest(
	'multiple instances share a single process-level SIGCONT listener',
	async t => {
		const listenersBefore = process.listenerCount('SIGCONT');

		const first = render(<InteractiveApp />, {
			stdout: createStdout(),
			stdin: createStdin(),
			interactive: true,
		});
		const second = render(<InteractiveApp />, {
			stdout: createStdout(),
			stdin: createStdin(),
			interactive: true,
		});
		await delay(50);

		t.is(process.listenerCount('SIGCONT'), listenersBefore + 1);

		first.unmount();
		await delay(50);
		t.is(process.listenerCount('SIGCONT'), listenersBefore + 1);

		second.unmount();
		await delay(50);
		t.is(process.listenerCount('SIGCONT'), listenersBefore);
	},
);
