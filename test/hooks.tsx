import process from 'node:process';
import crypto from 'node:crypto';
import url from 'node:url';
import path from 'node:path';
import test, {type ExecutionContext} from 'ava';
import stripAnsi from 'strip-ansi';
import {spawn} from 'node-pty';
import {ReadySignalFilter} from './helpers/ready-signal-filter.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const term = (fixture: string, args: string[] = []) => {
	let resolve: (value?: any) => void;
	let reject: (error?: Error) => void;

	// eslint-disable-next-line promise/param-names
	const exitPromise = new Promise((resolve2, reject2) => {
		resolve = resolve2;
		reject = reject2;
	});

	// Generate unique ready token for this test
	const readyToken = crypto.randomUUID();
	const readyFilter = new ReadySignalFilter(readyToken);

	const env: Record<string, string> = {
		...process.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_NO_WARNINGS: '1',
		// eslint-disable-next-line @typescript-eslint/naming-convention
		CI: 'false',
		// eslint-disable-next-line @typescript-eslint/naming-convention
		INK_READY_TOKEN: readyToken,
	};

	const ps = spawn(
		'node',
		[
			'--loader=ts-node/esm',
			path.join(__dirname, `./fixtures/${fixture}.tsx`),
			...args,
		],
		{
			name: 'xterm-color',
			cols: 100,
			cwd: __dirname,
			env,
		},
	);

	let readyResolve: () => void;
	let isReady = false;
	let output = '';

	// Attach onData handler immediately after spawn to catch early data
	ps.onData(data => {
		const filteredData = readyFilter.process(data);

		// Check for ready signal
		if (!isReady && readyFilter.hasSeenSignal()) {
			isReady = true;
			readyResolve?.();
		}

		output += filteredData;
	});

	const readyPromise = new Promise<void>(resolve => {
		readyResolve = resolve;
		// Fallback timeout for safety - if ready signal not received within 5 seconds
		setTimeout(() => {
			if (!isReady) {
				console.warn(
					'Warning: Ready signal not received within 5 seconds, proceeding anyway',
				);
				resolve();
			}
		}, 5000);
	});

	const result = {
		async write(input: string) {
			// Wait for Ink to be ready to accept input
			await readyPromise;
			ps.write(input);
		},
		get output() {
			return output;
		},
		waitForExit: async () => exitPromise,
	};

	ps.onExit(({exitCode}) => {
		if (exitCode === 0) {
			resolve();
			return;
		}

		reject(new Error(`Process exited with non-zero exit code: ${exitCode}`));
	});

	return result;
};

test.serial('useInput - handle lowercase character', async t => {
	const ps = term('use-input', ['lowercase']);
	await ps.write('q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle uppercase character', async t => {
	const ps = term('use-input', ['uppercase']);
	await ps.write('Q');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - \r should not count as an uppercase character',
	async t => {
		const ps = term('use-input', ['uppercase']);
		await ps.write('\r');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - pasted carriage return', async t => {
	const ps = term('use-input', ['pastedCarriageReturn']);
	await ps.write('\rtest');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - pasted tab', async t => {
	const ps = term('use-input', ['pastedTab']);
	await ps.write('\ttest');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle escape', async t => {
	const ps = term('use-input', ['escape']);
	await ps.write('\u001B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl', async t => {
	const ps = term('use-input', ['ctrl']);
	await ps.write('\u0006');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta', async t => {
	const ps = term('use-input', ['meta']);
	await ps.write('\u001Bm');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handles meta letter split across chunks', async t => {
	const ps = term('use-input', ['chunkedMetaLetter']);
	await ps.write('\u001B');
	process.nextTick(async () => {
		await ps.write('b');
	});
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - emits escape when delayed meta letter arrives late',
	async t => {
		const ps = term('use-input', ['chunkedMetaLetterDelayed']);
		await ps.write('\u001B');
		setTimeout(async () => {
			await ps.write('b');
		}, 10);
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - handles bracketed paste as text', async t => {
	const ps = term('use-input', ['bracketedPaste']);
	await ps.write('\u001B[200~');
	await ps.write('hello ');
	await ps.write('\u001B[Bworld');
	await ps.write('\u001B[201~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - emits empty bracketed paste content', async t => {
	const ps = term('use-input', ['emptyBracketedPaste']);
	await ps.write('\u001B[200~');
	await ps.write('\u001B[201~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - drops partial escape at stream end', async t => {
	const ps = term('use-input', ['partialEscapeDrop']);
	await ps.write('\u001B[');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle up arrow', async t => {
	const ps = term('use-input', ['upArrow']);
	await ps.write('\u001B[A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle down arrow', async t => {
	const ps = term('use-input', ['downArrow']);
	await ps.write('\u001B[B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle left arrow', async t => {
	const ps = term('use-input', ['leftArrow']);
	await ps.write('\u001B[D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle right arrow', async t => {
	const ps = term('use-input', ['rightArrow']);
	await ps.write('\u001B[C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - handles sequential CSI down arrows individually',
	async t => {
		const ps = term('use-input', ['rapidArrows']);
		await ps.write('\u001B[B\u001B[B\u001B[B');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - coalesces plain text paste into one event', async t => {
	const ps = term('use-input', ['coalescedText']);
	await ps.write('hello world');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handles mixed CSI and text input', async t => {
	const ps = term('use-input', ['mixedSequence']);
	await ps.write('\u001B[Bhello\u001B[B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - supports CSI sequences with non-letter finals',
	async t => {
		const ps = term('use-input', ['csiFinals']);
		await ps.write('\u001B[@\u001B[100~');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - handles CSI split across chunks', async t => {
	const ps = term('use-input', ['chunkedCsi']);
	await ps.write('\u001B[');
	await ps.write('100~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - rejects invalid CSI parameter bytes', async t => {
	const ps = term('use-input', ['invalidCsiParams']);
	await ps.write('\u001B[12\u0000\u0001@');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handles OSC title sequence', async t => {
	const ps = term('use-input', ['oscTitle']);
	await ps.write('\u001B]0;Ink Title\u0007');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handles OSC hyperlink sequence', async t => {
	const ps = term('use-input', ['oscHyperlink']);
	await ps.write(
		'\u001B]8;;https://example.com\u0007Ink Hyperlink\u001B]8;;\u0007',
	);
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handles DCS sequence', async t => {
	const ps = term('use-input', ['dcsSequence']);
	await ps.write('\u001BP1;2|payload\u001B\\');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handles escape depth boundary case', async t => {
	const ps = term('use-input', ['escapeDepthBoundary']);
	await ps.write('\u001B'.repeat(32) + 'A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - splits escape depth overflow into separate events',
	async t => {
		const ps = term('use-input', ['escapeDepthExceeded']);
		await ps.write('\u001B'.repeat(33) + 'A');
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - preserves high-unicode paste integrity', async t => {
	const ps = term('use-input', ['emojiPaste']);
	await ps.write('👋🌍');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - preserves emoji family grapheme', async t => {
	const ps = term('use-input', ['emojiFamilySingle']);
	await ps.write('👨‍👩‍👧‍👦');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - preserves chunked emoji family grapheme', async t => {
	const ps = term('use-input', ['emojiFamilyChunked']);
	await ps.write('👨');
	await ps.write('‍👩‍👧‍👦');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + up arrow', async t => {
	const ps = term('use-input', ['upArrowMeta']);
	await ps.write('\u001B\u001B[A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + down arrow', async t => {
	const ps = term('use-input', ['downArrowMeta']);
	await ps.write('\u001B\u001B[B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + left arrow', async t => {
	const ps = term('use-input', ['leftArrowMeta']);
	await ps.write('\u001B\u001B[D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle meta + right arrow', async t => {
	const ps = term('use-input', ['rightArrowMeta']);
	await ps.write('\u001B\u001B[C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + up arrow', async t => {
	const ps = term('use-input', ['upArrowCtrl']);
	await ps.write('\u001B[1;5A');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + down arrow', async t => {
	const ps = term('use-input', ['downArrowCtrl']);
	await ps.write('\u001B[1;5B');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + left arrow', async t => {
	const ps = term('use-input', ['leftArrowCtrl']);
	await ps.write('\u001B[1;5D');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle ctrl + right arrow', async t => {
	const ps = term('use-input', ['rightArrowCtrl']);
	await ps.write('\u001B[1;5C');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle page down', async t => {
	const ps = term('use-input', ['pageDown']);
	await ps.write('\u001B[6~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle page up', async t => {
	const ps = term('use-input', ['pageUp']);
	await ps.write('\u001B[5~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle tab', async t => {
	const ps = term('use-input', ['tab']);
	await ps.write('\t');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle shift + tab', async t => {
	const ps = term('use-input', ['shiftTab']);
	await ps.write('\u001B[Z');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle backspace', async t => {
	const ps = term('use-input', ['backspace']);
	await ps.write('\u0008');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle delete', async t => {
	const ps = term('use-input', ['delete']);
	await ps.write('\u007F');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - handle remove (delete)', async t => {
	const ps = term('use-input', ['remove']);
	await ps.write('\u001B[3~');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - preserves flag emoji grapheme', async t => {
	const ps = term('use-input', ['flagEmoji']);
	await ps.write('🇺🇳');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - preserves variation selector emoji', async t => {
	const ps = term('use-input', ['variationSelectorEmoji']);
	await ps.write('✂️');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - preserves emoji keycap sequence', async t => {
	const ps = term('use-input', ['keycapEmoji']);
	await ps.write('1️⃣');
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial(
	'useInput - preserves chunked airplane emoji with variation selector',
	async t => {
		const ps = term('use-input', ['airplaneEmojiChunked']);
		await ps.write('✈');
		process.nextTick(async () => {
			await ps.write('\uFE0F'); // VS16
		});
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial(
	'useInput - preserves chunked heart emoji with variation selector',
	async t => {
		const ps = term('use-input', ['heartEmojiChunked']);
		await ps.write('♥');
		process.nextTick(async () => {
			await ps.write('\uFE0F'); // VS16
		});
		await ps.waitForExit();
		t.true(ps.output.includes('exited'));
	},
);

test.serial('useInput - forwards isolated surrogate code units', async t => {
	const ps = term('use-input', ['isolatedSurrogate']);
	await ps.write('\uD83D');
	process.nextTick(async () => {
		await ps.write('X');
	});
	await ps.waitForExit();
	t.true(ps.output.includes('exited'));
});

test.serial('useInput - ignore input if not active', async t => {
	const ps = term('use-input-multiple');
	await ps.write('x');
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
			await ps.write('\u0003');
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

// `node-pty` doesn't support streaming stderr output, so I need to figure out
// how to test useStderr() hook. child_process.spawn() can't be used, because
// Ink fails with "raw mode unsupported" error.
test.todo('useStderr - write to stderr');
