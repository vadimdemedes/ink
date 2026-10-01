import test, {type TestContext} from 'node:test';
import stripAnsi from 'strip-ansi';
import term from './helpers/term.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

test('useInput - ignore input if not active', async (t: TestContext) => {
	const ps = term('use-input-multiple');
	ps.write('x');
	await ps.waitForExit();
	t.assert.strictEqual(ps.output.includes('xx'), false);
	t.assert.ok(ps.output.includes('x'));
	t.assert.ok(ps.output.includes('exited'));
});

// Runs a flaky test body up to `attempts` times and only fails if every attempt fails
const runWithRetries = async (run: () => Promise<void>, attempts = 3) => {
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			// eslint-disable-next-line no-await-in-loop
			await run();
			return;
		} catch (error) {
			if (attempt === attempts) {
				throw error;
			}
		}
	}
};

// For some reason this test is flaky, so we have to resort to retrying it multiple times
test('useInput - handle Ctrl+C when `exitOnCtrlC` is `false`', async (t: TestContext) => {
	const run = async () => {
		const ps = term('use-input-ctrl-c');
		ps.write('\u{3}');
		await ps.waitForExit();
		t.assert.ok(ps.output.includes('exited'));
	};

	await runWithRetries(run);
});

test('useInput - no MaxListenersExceededWarning with many useInput hooks', async (t: TestContext) => {
	const ps = term('use-input-many');
	await ps.waitForExit();
	t.assert.strictEqual(
		ps.output.includes('MaxListenersExceededWarning'),
		false,
	);
	t.assert.ok(ps.output.includes('exited'));
});

test('useInput - handle Ctrl+C via kitty protocol when `exitOnCtrlC` is `false`', async (t: TestContext) => {
	const run = async () => {
		const ps = term('use-input-ctrl-c');
		// Ctrl+C uses the unshifted letter codepoint (modifier 5 = ctrl(4) + 1)
		ps.write('\u{1B}[99;5u');
		await ps.waitForExit();
		t.assert.ok(ps.output.includes('exited'));
	};

	await runWithRetries(run);
});

test('useStdout - write to stdout', async (t: TestContext) => {
	const ps = term('use-stdout');
	await ps.waitForExit();

	const lines = stripAnsi(ps.output).split('\r\n');

	t.assert.deepStrictEqual(lines.slice(1, -1), [
		'Hello from Ink to stdout',
		'Hello World',
		'exited',
	]);
});

test('useStderr - write to stderr', async (t: TestContext) => {
	const ps = term('use-stderr');
	await ps.waitForExit();

	// Both streams share the PTY. Separate-stream tests in cursor.tsx cover routing; reconstruct the screen here to verify clearing and repainting.
	const lines = reconstructTerminalLines(ps.output, 24).filter(Boolean);

	t.assert.deepStrictEqual(lines, [
		'Hello from Ink to stderr',
		'Hello World',
		'exited',
	]);
});
