import test, {type ExecutionContext} from 'ava';
import stripAnsi from 'strip-ansi';
import term from './helpers/term.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

test.serial('useInput - ignore input if not active', async t => {
	const ps = term('use-input-multiple');
	ps.write('x');
	await ps.waitForExit();
	t.false(ps.output.includes('xx'));
	t.true(ps.output.includes('x'));
	t.true(ps.output.includes('exited'));
});

// For some reason this test is flaky, so we have to resort to using `t.try` to run it multiple times
test.serial(
	'useInput - handle Ctrl+C when `exitOnCtrlC` is `false`',
	async t => {
		const run = async (tt: ExecutionContext) => {
			const ps = term('use-input-ctrl-c');
			ps.write('\u0003');
			await ps.waitForExit();
			tt.true(ps.output.includes('exited'));
		};

		const firstTry = await t.try(run);

		if (firstTry.passed) {
			firstTry.commit();
			return;
		}

		firstTry.discard();

		const secondTry = await t.try(run);

		if (secondTry.passed) {
			secondTry.commit();
			return;
		}

		secondTry.discard();

		const thirdTry = await t.try(run);
		thirdTry.commit();
	},
);

test.serial(
	'useInput - no MaxListenersExceededWarning with many useInput hooks',
	async t => {
		const ps = term('use-input-many');
		await ps.waitForExit();
		t.false(ps.output.includes('MaxListenersExceededWarning'));
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'useInput - handle Ctrl+C via kitty protocol when `exitOnCtrlC` is `false`',
	async t => {
		const run = async (tt: ExecutionContext) => {
			const ps = term('use-input-ctrl-c');
			// Ctrl+C uses the unshifted letter codepoint (modifier 5 = ctrl(4) + 1)
			ps.write('\u001B[99;5u');
			await ps.waitForExit();
			tt.true(ps.output.includes('exited'));
		};

		const firstTry = await t.try(run);

		if (firstTry.passed) {
			firstTry.commit();
			return;
		}

		firstTry.discard();

		const secondTry = await t.try(run);

		if (secondTry.passed) {
			secondTry.commit();
			return;
		}

		secondTry.discard();

		const thirdTry = await t.try(run);
		thirdTry.commit();
	},
);

test.serial('useStdout - write to stdout', async t => {
	const ps = term('use-stdout');
	await ps.waitForExit();

	const lines = stripAnsi(ps.output).split('\r\n');

	t.deepEqual(lines.slice(1, -1), [
		'Hello from Ink to stdout',
		'Hello World',
		'exited',
	]);
});

test.serial('useStderr - write to stderr', async t => {
	const ps = term('use-stderr');
	await ps.waitForExit();

	// Both streams share the PTY. Separate-stream tests in cursor.tsx cover routing; reconstruct the screen here to verify clearing and repainting.
	const lines = reconstructTerminalLines(ps.output, 24).filter(Boolean);

	t.deepEqual(lines, ['Hello from Ink to stderr', 'Hello World', 'exited']);
});
