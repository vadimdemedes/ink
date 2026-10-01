import process from 'node:process';
import EventEmitter from 'node:events';
import vm from 'node:vm';
import {spawn as spawnProcess} from 'node:child_process';
import {PassThrough, Readable, Writable} from 'node:stream';
import url from 'node:url';
import * as path from 'node:path';
import {createRequire} from 'node:module';
import test, {type TestContext} from 'node:test';
import FakeTimers from '@sinonjs/fake-timers';
import {stub, spy} from 'sinon';
import React, {
	type ReactElement,
	type ReactNode,
	PureComponent,
	useEffect,
	useState,
} from 'react';
import ansiEscapes from 'ansi-escapes';
import stripAnsi from 'strip-ansi';
import boxen from 'boxen';
import delay from 'delay';
import {
	render,
	Box,
	Text,
	Static,
	useApp,
	useCursor,
	useInput,
	useStdin,
	useStdout,
} from '../src/index.js';
import {type RenderMetrics, homeAndEraseDown} from '../src/ink.js';
import {bsu, esu} from '../src/write-synchronized.js';
import instances from '../src/instances.js';
import {type DOMElement} from '../src/dom.js';
import {createStdin, emitReadable} from './helpers/create-stdin.js';
import createStdout from './helpers/create-stdout.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

const textDecoder = new TextDecoder();

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const createWritable = (): Writable =>
	new Writable({
		write(_chunk, _encoding, callback) {
			callback();
		},
	});

const createCallbackWritableStream = (
	onWriteCallback: () => void,
): NodeJS.WritableStream => {
	const stream = new EventEmitter();

	Object.assign(stream, {
		writable: true,
		write(_chunk: string | Uint8Array, callback?: () => void) {
			setTimeout(() => {
				onWriteCallback();
				callback?.();
			}, 20);

			return true;
		},
		end() {
			return stream;
		},
	});

	return stream as unknown as NodeJS.WritableStream;
};

// eslint-disable-next-line node-test/require-assertion -- Passes when rendering does not throw.
test('accepts standard Node streams without stream-specific assertions', async () => {
	const stdout = createWritable();
	const stdin = new Readable({
		read() {},
	});

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		stdin,
		stderr: stdout,
		interactive: true,
		patchConsole: false,
	});

	unmount();
	await waitUntilExit();
});

test('reports raw mode as unavailable when a TTY input stream lacks raw mode', async (t: TestContext) => {
	let isRawModeSupported: boolean | undefined;

	const stdin = new Readable({
		read() {},
	});
	Object.defineProperty(stdin, 'isTTY', {value: true});

	function Test() {
		isRawModeSupported = useStdin().isRawModeSupported;
		return <Text>Hello</Text>;
	}

	const stdout = createWritable();

	const {unmount, waitUntilExit} = render(<Test />, {
		stdout,
		stdin,
		interactive: false,
		patchConsole: false,
	});

	t.assert.strictEqual(isRawModeSupported, false);
	unmount();
	await waitUntilExit();
});

test('handles input without requiring process ref methods', async (t: TestContext) => {
	const rawModeChanges: boolean[] = [];
	let receivedInput = '';
	const stdin = new Readable({
		read() {},
	});
	Object.defineProperties(stdin, {
		// eslint-disable-next-line @typescript-eslint/naming-convention -- Node.js stream property name.
		isTTY: {value: true},
		setRawMode: {
			value(isEnabled: boolean) {
				rawModeChanges.push(isEnabled);
			},
		},
	});

	function Test() {
		useInput(input => {
			receivedInput = input;
		});

		return <Text>Hello</Text>;
	}

	const stdout = createWritable();

	const {unmount, waitUntilExit} = render(<Test />, {
		stdout,
		stdin,
		interactive: false,
		patchConsole: false,
	});

	t.assert.deepStrictEqual(rawModeChanges, [true]);
	stdin.push('a');
	await delay(0);
	t.assert.strictEqual(receivedInput, 'a');

	unmount();
	await new Promise(resolve => {
		queueMicrotask(resolve);
	});
	await waitUntilExit();
	t.assert.deepStrictEqual(rawModeChanges, [true, false]);
});

const term = (
	fixture: string,
	args: string[] = [],
	options: {columns?: number; rows?: number; env?: NodeJS.ProcessEnv} = {},
) => {
	const {promise: exitPromise, resolve, reject} = Promise.withResolvers<void>();

	const env = {
		...process.env,
		...options.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_NO_WARNINGS: '1',
	};

	const ps = spawn(
		process.execPath,
		[
			'--import=tsx',
			path.join(__dirname, `./fixtures/${fixture}.tsx`),
			...args,
		],
		{
			name: 'xterm-color',
			cols: options.columns ?? 100,
			cwd: __dirname,
			env,
			...(options.rows !== undefined && {rows: options.rows}),
		},
	);

	const result = {
		write(input: string) {
			ps.write(input);
		},
		resize(columns: number, rows: number) {
			ps.resize(columns, rows);
		},
		output: '',
		waitForExit: async () => exitPromise,
		async waitForOutput(text: string) {
			for (let attempt = 0; attempt < 100; attempt++) {
				if (result.output.includes(text)) {
					return;
				}

				// eslint-disable-next-line no-await-in-loop -- Wait for the terminal to process input before checking again.
				await delay(20);
			}

			throw new Error(`Timed out waiting for ${JSON.stringify(text)}`);
		},
	};

	ps.onData(data => {
		// Strip Synchronized Update Mode sequences (bsu/esu) so tests
		// only see the actual content, not the transport wrapper.
		result.output += data
			.replaceAll('\u{1B}[?2026h', '')
			.replaceAll('\u{1B}[?2026l', '');
	});

	ps.onExit(({exitCode}) => {
		if (exitCode === 0) {
			resolve();
			return;
		}

		reject(new Error(`Process exited with non-zero exit code: ${exitCode}`));
	});

	return result;
};

const countOccurrences = (text: string, searchValue: string): number =>
	searchValue === '' ? 0 : text.split(searchValue).length - 1;

test('Jest example announces completion only after all results', async (t: TestContext) => {
	const ps = term('../../examples/jest/jest', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false', FORCE_COLOR: '0'},
	});
	await ps.waitForExit();

	const output = stripAnsi(ps.output);
	const allResultsIndex = output.indexOf('10 total');
	t.assert.ok(allResultsIndex >= 0);
	t.assert.ok(output.indexOf('Ran all test suites.') > allResultsIndex);
});

test('undefined stream options use the default streams', async (t: TestContext) => {
	const ps = term('undefined-render-streams', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true'},
	});
	await ps.waitForExit();
	t.assert.ok(ps.output.includes('Default streams: true'));
});

test('IME example deletes whole graphemes with backspace', async (t: TestContext) => {
	/* eslint-disable no-await-in-loop -- Terminal input and output must be processed sequentially. */
	const ps = term('../../examples/cursor-ime/cursor-ime', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Type Korean');
	ps.write('A');
	await ps.waitForOutput('> A');
	for (const character of ['😀', '👩‍💻', 'e\u{301}']) {
		ps.write(character);
		await ps.waitForOutput(character);
		ps.output = '';
		ps.write('\u{7F}');
		await ps.waitForOutput(ansiEscapes.eraseLines(3));

		t.assert.strictEqual(ps.output.includes('�'), false);
		t.assert.ok(ps.output.includes('> A'));
		t.assert.ok(ps.output.includes(ansiEscapes.cursorTo(3)));
	}
	/* eslint-enable no-await-in-loop */
});

test('IME example ignores Enter when editing text', async (t: TestContext) => {
	const ps = term('../../examples/cursor-ime/cursor-ime', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Type Korean');
	ps.write('한글');
	await ps.waitForOutput('> 한글');
	ps.output = '';
	// Use an encoded Backspace so both key events remain distinct in one input chunk.
	ps.write('\r\u{1B}[127u');
	await ps.waitForOutput('> 한\r\n');
	t.assert.strictEqual(ps.output.includes('> 한글'), false);
	t.assert.ok(ps.output.includes(ansiEscapes.cursorTo(4)));
});

test('IME example places the cursor after wrapped input', async (t: TestContext) => {
	const ps = term('../../examples/cursor-ime/cursor-ime', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Type Korean');
	ps.output = '';
	ps.write('한'.repeat(52));
	await ps.waitForOutput('한한한\r\n');
	t.assert.ok(
		ps.output.includes(ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(6)),
	);

	ps.output = '';
	ps.write('\u{7F}\u{7F}\u{7F}');
	await ps.waitForOutput('한'.repeat(49));
	t.assert.ok(ps.output.includes(ansiEscapes.cursorTo(0) + '\u{1B}[?25h'));
});

test('table example keeps all columns visible in narrow terminals', async (t: TestContext) => {
	const ps = term('../../examples/table/table', [], {
		columns: 40,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true', FORCE_COLOR: '0'},
	});
	await ps.waitForExit();
	t.assert.match(stripAnsi(ps.output), /^ID\s+Name\s+Email\r?\n/);
	t.assert.ok(stripAnsi(ps.output).split(/\r?\n/, 1)[0]!.length <= 40);
});

test('subprocess example retains recent lines across chunks', async (t: TestContext) => {
	const ps = term('subprocess-output-example', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true', FORCE_COLOR: '0'},
	});
	await ps.waitForExit();
	t.assert.deepStrictEqual(
		stripAnsi(ps.output)
			.split(/\r?\n/)
			.map(line => line.trim())
			.filter(Boolean),
		['Command output:', 'two', 'three', 'four', 'five', 'six'],
	);
});

test('terminal resize example stays open to report resized dimensions', async (t: TestContext) => {
	const ps = term('../../examples/terminal-resize/terminal-resize', [], {
		rows: 24,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false', FORCE_COLOR: '0'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Columns: 100');
	await ps.waitForOutput('Rows: 24');
	// Give the process time to exit if nothing is keeping the example alive.
	await delay(100);
	ps.output = '';
	ps.resize(60, 20);
	await ps.waitForOutput('Columns: 60');
	await ps.waitForOutput('Rows: 20');
	t.assert.ok(ps.output.includes('Rows: 20'));
});

test('stdout example updates displayed dimensions after resize', async (t: TestContext) => {
	const ps = term('../../examples/use-stdout/use-stdout', [], {
		rows: 24,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false', FORCE_COLOR: '0'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Width: 100');
	await ps.waitForOutput('Height: 24');
	ps.output = '';
	ps.resize(60, 20);
	await ps.waitForOutput('Width: 60');
	await ps.waitForOutput('Height: 20');
	t.assert.ok(ps.output.includes('Height: 20'));
});

test('transition example deletes a whole grapheme from both queries', async (t: TestContext) => {
	const ps = term('../../examples/use-transition/use-transition', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false', FORCE_COLOR: '0'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Search: (type something)');
	ps.write('Apple👩‍💻');
	await ps.waitForOutput('Results for "Apple👩‍💻":');
	ps.output = '';
	ps.write('\u{7F}');
	await ps.waitForOutput('Results for "Apple":');
	t.assert.match(ps.output, /Search: Apple(?: \(updating\.\.\.\))?\r?\n/);
	t.assert.ok(ps.output.includes('Item 1: Apple'));
});

test('transition example ignores Enter in the search query', async (t: TestContext) => {
	const ps = term('../../examples/use-transition/use-transition', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false', FORCE_COLOR: '0'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Search: (type something)');
	ps.write('Apple');
	await ps.waitForOutput('Results for "Apple":');
	ps.output = '';
	// Use an encoded Backspace so both key events remain distinct in one input chunk.
	ps.write('\r\u{1B}[127u');
	await ps.waitForOutput('Results for "Appl":');
	t.assert.match(ps.output, /Search: Appl(?: \(updating\.\.\.\))?\r?\n/);
	t.assert.ok(ps.output.includes('Item 1: Apple'));
});

for (const [editor, status] of [
	['false', 'child failed:'],
	['true', 'resumed'],
	['printf editor-command-ran', 'resumed'],
] as const) {
	test(`suspend example reports the result of ${editor}`, async (t: TestContext) => {
		const ps = term('../../examples/suspend-terminal/suspend-terminal', [], {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			env: {CI: 'false', FORCE_COLOR: '0', EDITOR: editor},
		});
		t.after(async () => {
			ps.write('q');
			await ps.waitForExit();
		});

		await ps.waitForOutput('ready');
		ps.output = '';
		ps.write('e');
		await ps.waitForOutput(status);
		if (editor.startsWith('printf ')) {
			t.assert.ok(ps.output.includes('editor-command-ran'));
		}

		ps.write('+');
		await ps.waitForOutput('Counter: 1');
		t.assert.ok(ps.output.includes(status));
	});
}

test('subprocess example strips ANSI sequences across chunks', async (t: TestContext) => {
	const ps = term('subprocess-output-example', ['ansi'], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true', FORCE_COLOR: '0'},
	});
	await ps.waitForExit();
	t.assert.deepStrictEqual(
		stripAnsi(ps.output)
			.split(/\r?\n/)
			.map(line => line.trim())
			.filter(Boolean),
		['Command output:', 'Red text'],
	);
});

for (const count of [1, 2, 3]) {
	test(`aria example applies ${count} consecutive checkbox toggles`, async (t: TestContext) => {
		const ps = term('aria-example', [String(count)], {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			env: {CI: 'true', FORCE_COLOR: '0'},
		});
		await ps.waitForExit();
		t.assert.ok(stripAnsi(ps.output).includes(count % 2 === 0 ? '[ ]' : '[x]'));
	});
}

test('subprocess example displays command launch errors', async (t: TestContext) => {
	const ps = term('subprocess-output-example', ['error'], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true', FORCE_COLOR: '0'},
	});
	await ps.waitForExit();
	t.assert.deepStrictEqual(
		stripAnsi(ps.output)
			.split(/\r?\n/)
			.map(line => line.trim())
			.filter(Boolean),
		['Command output:', 'spawn npm ENOENT'],
	);
});

test('subprocess example decodes UTF-8 across chunks', async (t: TestContext) => {
	const ps = term('subprocess-output-example', ['unicode'], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true', FORCE_COLOR: '0'},
	});
	await ps.waitForExit();
	t.assert.deepStrictEqual(
		stripAnsi(ps.output)
			.split(/\r?\n/)
			.map(line => line.trim())
			.filter(Boolean),
		['Command output:', '한🙂'],
	);
});

test('chat example submits intact text after deleting an emoji', async (t: TestContext) => {
	const ps = term('../../examples/chat/chat', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Enter your message:');
	ps.write('Hi 👩‍💻');
	await ps.waitForOutput('Hi 👩‍💻');
	ps.output = '';
	ps.write('\u{7F}');
	await ps.waitForOutput('Enter your message: Hi');
	ps.output = '';
	ps.write('\r');
	await ps.waitForOutput('User: Hi');

	t.assert.match(stripAnsi(ps.output), /User: Hi\r?\n/);
});

test('chat example submits pending edits from the same input chunk', async (t: TestContext) => {
	const ps = term('../../examples/chat/chat', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Enter your message:');
	ps.write('Hello');
	await ps.waitForOutput('Enter your message: Hello');
	ps.write('\u{7F}\r');
	await ps.waitForOutput('User: Hell');
	t.assert.match(stripAnsi(ps.output), /User: Hell\r?\n/);

	ps.write('A');
	await ps.waitForOutput('Enter your message: A');
	ps.output = '';
	ps.write('\u{7F}\r');
	await ps.waitForOutput('Enter your message:');
	t.assert.doesNotMatch(stripAnsi(ps.output), /User: A/);
});

test('chat example does not insert modified shortcuts into messages', async (t: TestContext) => {
	const ps = term('../../examples/chat/chat', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('\u{3}');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Enter your message:');
	ps.write('Hello');
	await ps.waitForOutput('Enter your message: Hello');
	ps.write('\u{1}\u{1B}b!');
	await ps.waitForOutput('!');
	ps.write('\r');
	await ps.waitForOutput('User: Hello');
	t.assert.match(stripAnsi(ps.output), /User: Hello!\r?\n/);
});

test('scroll example handles consecutive arrow keys in one input chunk', async (t: TestContext) => {
	const ps = term('../../examples/scroll/scroll', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('q');
		await ps.waitForExit();
	});

	await ps.waitForOutput('scrollTop=0/32');
	ps.output = '';
	ps.write('\u{1B}[B\u{1B}[B');
	await ps.waitForOutput('scrollTop=');
	t.assert.match(stripAnsi(ps.output), /scrollTop=2\/32/);

	ps.output = '';
	ps.write('\u{1B}[C\u{1B}[C');
	await ps.waitForOutput('scrollTop=');
	t.assert.match(stripAnsi(ps.output), /scrollLeft=4\/42/);

	ps.output = '';
	ps.write('\u{1B}[A\u{1B}[A');
	await ps.waitForOutput('scrollTop=');
	t.assert.match(stripAnsi(ps.output), /scrollTop=0\/32/);

	ps.output = '';
	ps.write('\u{1B}[D\u{1B}[D');
	await ps.waitForOutput('scrollTop=');
	t.assert.match(stripAnsi(ps.output), /scrollLeft=0\/42/);
});

test('input example handles consecutive movement keys', async (t: TestContext) => {
	const ps = term('../../examples/use-input/use-input', [], {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('q');
		await ps.waitForExit();
	});

	await ps.waitForOutput('^_^');
	ps.output = '';
	ps.write('\u{1B}[C\u{1B}[C\u{1B}[B\u{1B}[B');
	await ps.waitForOutput('^_^');
	t.assert.match(stripAnsi(ps.output), /\n {3}\^_\^\r?\n/);
	t.assert.strictEqual(
		stripAnsi(ps.output)
			.split('\n')
			.findIndex(line => line.includes('^_^')),
		4,
	);

	ps.output = '';
	ps.write('\u{1B}[D\u{1B}[D\u{1B}[A\u{1B}[A');
	await ps.waitForOutput('^_^');
	t.assert.match(stripAnsi(ps.output), /\n \^_\^\r?\n/);
	t.assert.strictEqual(
		stripAnsi(ps.output)
			.split('\n')
			.findIndex(line => line.includes('^_^')),
		2,
	);
});

test('incremental example keeps its selection visible after resize', async (t: TestContext) => {
	const ps = term(
		'../../examples/incremental-rendering/incremental-rendering',
		[],
		{
			rows: 80,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			env: {CI: 'false', FORCE_COLOR: '0'},
		},
	);
	t.after(async () => {
		ps.write('q');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Selected: Server Authentication');
	ps.write('\u{1B}[A');
	await ps.waitForOutput('Selected: Recommendation Engine');
	ps.output = '';
	ps.resize(100, 30);
	await ps.waitForOutput('System Services Monitor (10 of 30 services)');
	t.assert.ok(
		stripAnsi(ps.output).includes('Selected: WebSocket Connection Manager'),
	);

	ps.output = '';
	ps.write('\u{1B}[B');
	await ps.waitForOutput('Selected: Server Authentication');
	t.assert.ok(stripAnsi(ps.output).includes('> Server Authentication'));
});

test('incremental example grows its logs after terminal resize', async (t: TestContext) => {
	const ps = term(
		'../../examples/incremental-rendering/incremental-rendering',
		[],
		{
			rows: 30,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			env: {CI: 'false', FORCE_COLOR: '0'},
		},
	);
	t.after(async () => {
		ps.write('q');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Worker-3');
	t.assert.strictEqual(stripAnsi(ps.output).includes('Worker-12'), false);
	ps.output = '';
	ps.resize(100, 60);
	await ps.waitForOutput('System Services Monitor (30 of 30 services)');
	await ps.waitForOutput('Worker-12');
	t.assert.ok(stripAnsi(ps.output).includes('Worker-12'));
});

test('snake ignores a reversal queued between ticks', async (t: TestContext) => {
	const ps = term('alternate-screen-example', [], {
		rows: 30,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
	});
	t.after(async () => {
		ps.write('q');
		await ps.waitForExit();
	});

	await ps.waitForOutput('Arrow keys: move');
	ps.output = '';
	ps.write('\u{1B}[A\u{1B}[D');
	await ps.waitForOutput('Score:');

	t.assert.strictEqual(ps.output.includes('Game Over!'), false);
	t.assert.ok(ps.output.includes('Arrow keys: move'));
});

const isWriteBarrierChunk = (chunk: string | Uint8Array): boolean =>
	(typeof chunk === 'string' && chunk === '') ||
	(chunk instanceof Uint8Array && chunk.length === 0);

const toRenderedChunk = (chunk: string | Uint8Array): string =>
	stripAnsi(typeof chunk === 'string' ? chunk : textDecoder.decode(chunk));

const isCursorOrSyncEscape = (chunk: string | Uint8Array): boolean => {
	const text = typeof chunk === 'string' ? chunk : textDecoder.decode(chunk);
	return text.startsWith('\u{1B}[?25') || text === bsu || text === esu;
};

const isRenderContent = (chunk: string | Uint8Array): boolean =>
	!isWriteBarrierChunk(chunk) && !isCursorOrSyncEscape(chunk);

const getContentWrites = (writeSpy: any): string[] =>
	(writeSpy.args as string[][])
		.map((args: string[]) => args[0]!)
		.filter((w: string) => isRenderContent(w));

const createDelayedWriteCallbackStdout = ({
	shouldDelay,
	onDelayElapsed,
	delayMs = 150,
}: {
	readonly shouldDelay: (chunk: string | Uint8Array) => boolean;
	readonly onDelayElapsed: () => void;
	readonly delayMs?: number;
}): NodeJS.WriteStream => {
	let didDelayOnce = false;

	const stdout = new Writable({
		write(
			chunk: string | Uint8Array,
			_encoding: BufferEncoding,
			callback: (error?: Error) => void,
		) {
			if (!didDelayOnce && shouldDelay(chunk)) {
				didDelayOnce = true;

				setTimeout(() => {
					onDelayElapsed();
					callback();
				}, delayMs);

				return;
			}

			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;
	stdout.isTTY = true;
	return stdout;
};

type Issue450Fixture =
	| 'issue-450-full-height-rerender'
	| 'issue-450-full-height-rerender-with-marker'
	| 'issue-450-height-minus-one-rerender'
	| 'issue-450-full-height-with-static-rerender'
	| 'issue-450-initial-overflow'
	| 'issue-450-initial-fullscreen'
	| 'issue-450-grow-to-fullscreen-rerender'
	| 'issue-450-shrink-from-fullscreen-rerender'
	| 'issue-450-shrink-from-overflow-rerender'
	| 'issue-450-static-shrink-from-fullscreen-rerender'
	| 'issue-969-windows-full-height-rerender'
	| 'issue-935-overflow-rerender';

const runIssue450Fixture = async (
	fixture: Issue450Fixture,
	rows = 6,
): Promise<string> => {
	const processResult = term(fixture, [String(rows)]);
	await processResult.waitForExit();
	return processResult.output;
};

const runNonTtyFixture = async (
	fixture: string,
	args: string[] = [],
): Promise<string> => {
	let output = '';
	let errorOutput = '';
	const env = {
		...process.env,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		NODE_NO_WARNINGS: '1',
	};
	// Force non-CI code path while still using a non-TTY stdout stream.
	env.CI = 'false';

	const fixtureProcess = spawnProcess(
		'node',
		[
			'--import=tsx',
			path.join(__dirname, `./fixtures/${fixture}.tsx`),
			...args,
		],
		{
			cwd: __dirname,
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);

	fixtureProcess.stdout.on('data', (data: Uint8Array | string) => {
		output += typeof data === 'string' ? data : data.toString();
	});

	fixtureProcess.stderr.on('data', (data: Uint8Array | string) => {
		errorOutput += typeof data === 'string' ? data : data.toString();
	});

	const exitCode = await new Promise<number>((resolve, reject) => {
		fixtureProcess.on('error', reject);
		fixtureProcess.on('close', code => {
			resolve(code ?? 0);
		});
	});

	if (exitCode !== 0) {
		throw new Error(
			`Non-TTY fixture exited with code ${exitCode}: ${errorOutput}`,
		);
	}

	return output;
};

type Issue450FixtureResult = {
	output: string;
	fullClearCount: number;
	eraseLineCount: number;
};

const getIssue450ControlSequenceCounts = (output: string) => ({
	fullClearCount: countOccurrences(output, homeAndEraseDown),
	eraseLineCount: countOccurrences(output, ansiEscapes.eraseLines(1)),
});

const runIssue450FixtureWithCounts = async (
	fixture: Issue450Fixture,
	rows = 6,
): Promise<Issue450FixtureResult> => {
	const output = await runIssue450Fixture(fixture, rows);
	const {fullClearCount, eraseLineCount} =
		getIssue450ControlSequenceCounts(output);

	return {
		output,
		fullClearCount,
		eraseLineCount,
	};
};

const getOutputBeforeMarker = (
	t: TestContext,
	output: string,
	marker: string,
): string => {
	const markerIndex = output.indexOf(marker);
	t.assert.ok(markerIndex >= 0, `Fixture marker "${marker}" should be present`);
	return markerIndex >= 0 ? output.slice(0, markerIndex) : output;
};

const runIssue450FixtureBeforeMarker = async (
	t: TestContext,
	fixture: Issue450Fixture,
	marker: string,
	rows = 6,
): Promise<string> => {
	const output = await runIssue450Fixture(fixture, rows);
	return getOutputBeforeMarker(t, output, marker);
};

const assertIssue450DynamicFrameOutput = (
	t: TestContext,
	output: string,
): void => {
	t.assert.ok(
		output.includes('frame 8'),
		'Fixture should render multiple dynamic frames',
	);
};

class SynchronousErrorBoundary extends PureComponent<
	{
		onError: (error: Error) => void;
		children?: ReactElement;
	},
	{error?: Error}
> {
	static displayName = 'SynchronousErrorBoundary';

	static override getDerivedStateFromError(error: Error) {
		return {error};
	}

	override state: {error?: Error} = {
		error: undefined,
	};

	override componentDidCatch(error: Error) {
		this.props.onError(error);
	}

	override render() {
		return this.state.error ? null : this.props.children;
	}
}

function SynchronousRenderErrorComponent() {
	throw new Error('Synchronous render error');
}

function ThrowingComponentWithBoundary() {
	const {exit} = useApp();

	return (
		<SynchronousErrorBoundary onError={exit}>
			<SynchronousRenderErrorComponent />
		</SynchronousErrorBoundary>
	);
}

test('do not erase screen', async (t: TestContext) => {
	const ps = term('erase', ['4']);
	await ps.waitForExit();
	t.assert.strictEqual(ps.output.includes(homeAndEraseDown), false);

	for (const letter of ['A', 'B', 'C']) {
		t.assert.ok(ps.output.includes(letter));
	}
});

test('do not erase screen where <Static> is taller than viewport', async (t: TestContext) => {
	const ps = term('erase-with-static', ['4']);

	await ps.waitForExit();
	t.assert.strictEqual(ps.output.includes(homeAndEraseDown), false);

	for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
		t.assert.ok(ps.output.includes(letter));
	}
});

test('last line of <Static> survives a full-clear accounting frame (related to #973)', async (t: TestContext) => {
	const rows = 4;
	const ps = term('full-clear-static-accounting', [String(rows)], {
		rows,
	});
	await ps.waitForExit();

	// The raw stream still contains "F" even when it has been erased on screen,
	// so reconstruct the visible buffer (scrollback + viewport) and assert the
	// last committed <Static> line is actually still there.
	const visibleLines = reconstructTerminalLines(ps.output, rows).filter(
		line => line.length > 0,
	);

	// Positive control: "LIVE-0" only renders on the final live-region update —
	// the frame that performs the off-by-one erase. Without this guard, an early
	// exit (before that frame) would leave "F" trivially present and the test
	// would pass without ever exercising the bug.
	t.assert.ok(
		visibleLines.includes('LIVE-0'),
		`Expected the bug-triggering live-region update to have rendered, got ${JSON.stringify(
			visibleLines,
		)}`,
	);

	// Distinct-frame guards: if the three phases coalesced into fewer renders,
	// the off-by-one would never be planted and the assertions here would pass
	// without exercising the bug. Only the inflate frame renders "live-4", and
	// its overflow is what first routes a frame through the full clear.
	t.assert.ok(
		ps.output.includes('live-4'),
		'Expected the inflate phase to have rendered as its own frame',
	);
	t.assert.ok(
		ps.output.includes(homeAndEraseDown),
		'Expected the overflow to have routed a frame through the full-clear path',
	);

	// The shrink frame's full clear is the last one; the lowercase "live-0"
	// after it proves shrink and nudge rendered as separate frames.
	const lastClearIndex = ps.output.lastIndexOf(homeAndEraseDown);
	t.assert.strictEqual(
		ps.output.includes('live-4', lastClearIndex),
		false,
		'Expected the last full clear to be the shrink frame, not the inflate frame',
	);
	t.assert.ok(
		ps.output.includes('live-0', lastClearIndex),
		'Expected the shrink and nudge phases to have rendered as separate frames',
	);
	t.assert.ok(
		ps.output.includes('LIVE-0', lastClearIndex),
		'Expected the shrink and nudge phases to have rendered as separate frames',
	);

	t.assert.ok(
		visibleLines.includes('F'),
		`Last static line (F) must remain visible after a live-region update, got ${JSON.stringify(
			visibleLines,
		)}`,
	);
});

test('erase screen', async (t: TestContext) => {
	const ps = term('erase', ['3']);
	await ps.waitForExit();
	t.assert.ok(ps.output.includes(homeAndEraseDown));

	for (const letter of ['A', 'B', 'C']) {
		t.assert.ok(ps.output.includes(letter));
	}
});

test('erase screen where <Static> exists but interactive part is taller than viewport', async (t: TestContext) => {
	const ps = term('erase', ['3']);
	await ps.waitForExit();
	t.assert.ok(ps.output.includes(homeAndEraseDown));

	for (const letter of ['A', 'B', 'C']) {
		t.assert.ok(ps.output.includes(letter));
	}
});

test('erase screen where state changes', async (t: TestContext) => {
	const ps = term('erase-with-state-change', ['4']);
	await ps.waitForExit();

	// The final frame is between the last eraseLines sequence and cursorShow
	// Split on cursorShow to isolate the final rendered content before the cursor is shown
	const beforeCursorShow = ps.output.split(ansiEscapes.cursorShow)[0];
	if (beforeCursorShow === undefined || beforeCursorShow === '') {
		t.assert.fail('beforeCursorShow is undefined');
		return;
	}

	// Find the last occurrence of an eraseLines sequence
	// eraseLines(1) is the minimal erase pattern used by Ink
	const eraseLinesPattern = ansiEscapes.eraseLines(1);
	const lastEraseIndex = beforeCursorShow.lastIndexOf(eraseLinesPattern);

	const lastFrame =
		lastEraseIndex === -1
			? beforeCursorShow
			: beforeCursorShow.slice(lastEraseIndex + eraseLinesPattern.length);

	const lastFrameContent = stripAnsi(lastFrame);

	for (const letter of ['A', 'B', 'C']) {
		t.assert.strictEqual(lastFrameContent.includes(letter), false);
	}
});

test('erase screen where state changes in small viewport', async (t: TestContext) => {
	const ps = term('erase-with-state-change', ['3']);
	await ps.waitForExit();

	const frames = ps.output.split(homeAndEraseDown);
	const lastFrame = frames.at(-1);

	for (const letter of ['A', 'B', 'C']) {
		t.assert.strictEqual(lastFrame?.includes(letter), false);
	}
});

test('fullscreen mode should not add extra newline at the bottom', async (t: TestContext) => {
	const ps = term('fullscreen-no-extra-newline', ['5']);
	await ps.waitForExit();

	t.assert.ok(ps.output.includes('Bottom line'));

	const lastFrame = ps.output.split(homeAndEraseDown).at(-1) ?? '';

	// Check that the bottom line is at the end without extra newlines
	// In a 5-line terminal:
	// Line 1: Fullscreen: top
	// Lines 2-4: empty (from flexGrow)
	// Line 5: Bottom line (should be usable)
	const lines = lastFrame.split('\n');

	t.assert.strictEqual(
		lines.length,
		5,
		'Should have exactly 5 lines for 5-row terminal',
	);

	t.assert.ok(
		lines[4]?.includes('Bottom line') ?? false,
		'Bottom line should be on line 5',
	);
});

test('#442: full terminal-size box should not add an extra scroll line', async (t: TestContext) => {
	const rows = 5;
	const ps = term('issue-442-full-height', [String(rows)]);
	await ps.waitForExit();

	const lastFrame = ps.output.split(homeAndEraseDown).at(-1) ?? '';
	const lastFrameContent = stripAnsi(lastFrame);
	const lines = lastFrameContent.split('\n');

	t.assert.strictEqual(
		lastFrameContent.endsWith('\n'),
		false,
		'Should not end with a trailing newline in fullscreen mode',
	);
	t.assert.strictEqual(
		lines.length,
		rows,
		'Should render exactly terminal row count without an extra line',
	);
	t.assert.ok(lines.at(-1)?.includes('#442 bottom') ?? false);
});

test('#450: full-height rerenders should not repeatedly clear terminal', async (t: TestContext) => {
	const {output, fullClearCount, eraseLineCount} =
		await runIssue450FixtureWithCounts('issue-450-full-height-rerender');

	assertIssue450DynamicFrameOutput(t, output);
	t.assert.ok(
		fullClearCount <= 1,
		`Expected at most one full-clear sequence, received ${fullClearCount}`,
	);
	t.assert.ok(
		eraseLineCount > 0,
		'Expected incremental erase sequences for fullscreen rerenders',
	);
});

test('#969: full-height rerenders on Windows should clear terminal between frames', async (t: TestContext) => {
	const output = await runIssue450Fixture(
		'issue-969-windows-full-height-rerender',
	);

	assertIssue450DynamicFrameOutput(t, output);
	// Windows consoles scroll when the bottom-right cell is written, which
	// breaks incremental erase for fullscreen frames. Each rerender must fall
	// back to a full clear there.
	const fullClearCount = countOccurrences(output, homeAndEraseDown);
	t.assert.ok(
		fullClearCount >= 2,
		`Expected a full clear per fullscreen rerender, received ${fullClearCount}`,
	);
});

test('#450: initial overflowing frame should not clear terminal', async (t: TestContext) => {
	const renderedMarker = '__INITIAL_OVERFLOW_FRAME_RENDERED__';
	const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
		t,
		'issue-450-initial-overflow',
		renderedMarker,
		3,
	);

	t.assert.strictEqual(
		outputBeforeMarker.includes(homeAndEraseDown),
		false,
		'Initial overflowing render should not clear terminal',
	);
});

test('#450: initial full-height frame should not clear terminal', async (t: TestContext) => {
	const renderedMarker = '__INITIAL_FULLSCREEN_FRAME_RENDERED__';
	const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
		t,
		'issue-450-initial-fullscreen',
		renderedMarker,
		3,
	);

	t.assert.strictEqual(
		outputBeforeMarker.includes(homeAndEraseDown),
		false,
		'Initial full-height render should not clear terminal',
	);
});

test('#450 control: rows - 1 rerenders should avoid a full clear', async (t: TestContext) => {
	const {output, fullClearCount, eraseLineCount} =
		await runIssue450FixtureWithCounts('issue-450-height-minus-one-rerender');

	assertIssue450DynamicFrameOutput(t, output);
	t.assert.strictEqual(fullClearCount, 0);
	t.assert.ok(
		eraseLineCount > 0,
		'Expected incremental erase sequences for non-fullscreen rerenders',
	);
});

test('#935: overflowing rerenders must not erase terminal scrollback', async (t: TestContext) => {
	const rows = 6;
	const output = await runIssue450Fixture('issue-935-overflow-rerender', rows);
	const {fullClearCount} = getIssue450ControlSequenceCounts(output);

	assertIssue450DynamicFrameOutput(t, output);
	t.assert.ok(
		fullClearCount >= 2,
		`Expected a full clear per overflowing rerender, received ${fullClearCount}`,
	);

	// The fallback may only clear the viewport. CSI 3J erases the terminal's
	// scrollback and CSI 2J makes VS Code / Windows Terminal push the viewport
	// into scrollback before clearing, churning bounded history on every frame.
	t.assert.strictEqual(
		output.includes('\u{1B}[3J'),
		false,
		'Must not emit CSI 3J',
	);
	t.assert.strictEqual(
		output.includes(ansiEscapes.eraseScreen),
		false,
		'Must not emit CSI 2J',
	);
	t.assert.strictEqual(output.includes(ansiEscapes.clearTerminal), false);

	const visibleLines = reconstructTerminalLines(output, rows);
	for (let index = 0; index < rows; index++) {
		t.assert.ok(
			visibleLines.includes(`#935 scrollback ${index}`),
			`Pre-existing scrollback line ${index} must survive rerenders`,
		);
	}

	// The final viewport shows the last frame, and no stale row survives
	// anywhere the user can see: frame 7's label is longer than every other
	// frame's, so a missing or partial clear leaves `STALE-ROW` behind.
	const viewport = visibleLines.slice(-rows);
	t.assert.ok(viewport.some(line => line.includes('frame 8')));
	t.assert.strictEqual(
		visibleLines.some(line => line.includes('STALE-ROW')),
		false,
	);
});

test('#450: full-height rerenders should not clear before unmount', async (t: TestContext) => {
	const renderedMarker = '__FULL_HEIGHT_RERENDER_COMPLETED__';
	const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
		t,
		'issue-450-full-height-rerender-with-marker',
		renderedMarker,
	);
	const {fullClearCount} = getIssue450ControlSequenceCounts(outputBeforeMarker);

	assertIssue450DynamicFrameOutput(t, outputBeforeMarker);
	t.assert.strictEqual(fullClearCount, 0);
});

test('#450: grow from rows - 1 to full-height should not clear before unmount', async (t: TestContext) => {
	const renderedMarker = '__GROW_TO_FULLSCREEN_RERENDER_COMPLETED__';
	const outputBeforeMarker = await runIssue450FixtureBeforeMarker(
		t,
		'issue-450-grow-to-fullscreen-rerender',
		renderedMarker,
	);
	const {fullClearCount} = getIssue450ControlSequenceCounts(outputBeforeMarker);

	assertIssue450DynamicFrameOutput(t, outputBeforeMarker);
	t.assert.strictEqual(fullClearCount, 0);
});

test('#450: shrink from full-height to rows - 1 should clear exactly once', async (t: TestContext) => {
	const {output, fullClearCount} = await runIssue450FixtureWithCounts(
		'issue-450-shrink-from-fullscreen-rerender',
	);

	assertIssue450DynamicFrameOutput(t, output);
	t.assert.strictEqual(fullClearCount, 1);
});

test('#450: shrink from overflow to rows - 1 should clear exactly once', async (t: TestContext) => {
	const {output, fullClearCount} = await runIssue450FixtureWithCounts(
		'issue-450-shrink-from-overflow-rerender',
	);

	assertIssue450DynamicFrameOutput(t, output);
	t.assert.strictEqual(fullClearCount, 1);
});

test('#450: <Static> with shrink from full-height should clear exactly once', async (t: TestContext) => {
	const {output, fullClearCount} = await runIssue450FixtureWithCounts(
		'issue-450-static-shrink-from-fullscreen-rerender',
	);

	t.assert.ok(output.includes('#450 static line'));
	assertIssue450DynamicFrameOutput(t, output);
	t.assert.strictEqual(fullClearCount, 1);
});

test('#450: non-TTY full-height rerenders should never clear terminal', (t: TestContext) => {
	const rows = 6;
	const stdout = createStdout();
	stdout.rows = rows;
	const writes = captureWrites(stdout);

	function NonTtyRerenderTestComponent({
		frameCount,
	}: {
		readonly frameCount: number;
	}) {
		return (
			<Box height={rows} flexDirection="column">
				<Text>#450 top</Text>
				<Box flexGrow={1}>
					<Text>{`frame ${frameCount}`}</Text>
				</Box>
				<Text>#450 bottom</Text>
			</Box>
		);
	}

	const {rerender, unmount} = render(
		<NonTtyRerenderTestComponent frameCount={0} />,
		{stdout},
	);

	rerender(<NonTtyRerenderTestComponent frameCount={1} />);
	rerender(<NonTtyRerenderTestComponent frameCount={2} />);

	const {fullClearCount} = getIssue450ControlSequenceCounts(writes.join(''));
	t.assert.strictEqual(fullClearCount, 0);

	unmount();
});

test('#450: non-TTY overflow transitions should never clear terminal', (t: TestContext) => {
	const rows = 3;
	const stdout = createStdout();
	stdout.rows = rows;
	const writes = captureWrites(stdout);

	function NonTtyOverflowTransitionTestComponent({
		lineCount,
	}: {
		readonly lineCount: number;
	}) {
		const lines = [];
		for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
			lines.push(<Text key={lineNumber}>{`line ${lineNumber}`}</Text>);
		}

		return <Box flexDirection="column">{lines}</Box>;
	}

	const {rerender, unmount} = render(
		<NonTtyOverflowTransitionTestComponent lineCount={2} />,
		{stdout},
	);

	rerender(<NonTtyOverflowTransitionTestComponent lineCount={4} />);

	const {fullClearCount} = getIssue450ControlSequenceCounts(writes.join(''));
	t.assert.strictEqual(fullClearCount, 0);

	unmount();
});

test('#450: viewport shrink into overflow should clear once', async (t: TestContext) => {
	const rows = 6;
	const stdout = createTtyStdout();
	stdout.rows = rows;
	const writes = captureWrites(stdout);

	function ResizeBoundaryTestComponent() {
		return (
			<Box height={rows} flexDirection="column">
				<Text>#450 top</Text>
				<Box flexGrow={1}>
					<Text>#450 middle</Text>
				</Box>
				<Text>#450 bottom</Text>
			</Box>
		);
	}

	const {unmount} = render(<ResizeBoundaryTestComponent />, {stdout});

	writes.length = 0;
	stdout.rows = rows - 1;
	stdout.emit('resize');
	await delay(0);

	const {fullClearCount} = getIssue450ControlSequenceCounts(writes.join(''));
	t.assert.strictEqual(fullClearCount, 1);

	unmount();
});

test('#450: non-TTY grow-to-overflow rerender should not clear terminal', async (t: TestContext) => {
	const output = await runNonTtyFixture('issue-450-grow-to-overflow-rerender', [
		'3',
	]);
	t.assert.strictEqual(output.includes(homeAndEraseDown), false);
});

test('#725: non-TTY child process output is flushed', async (t: TestContext) => {
	const output = await runNonTtyFixture('issue-725-child-process');
	const plainOutput = stripAnsi(output);

	t.assert.ok(plainOutput.includes('ready-stdin-not-tty'));
	t.assert.ok(plainOutput.includes('exited'));
});

test('useAnimation can drive non-interactive process exit', async (t: TestContext) => {
	const output = await runNonTtyFixture('use-animation-non-interactive-exit');

	t.assert.ok(stripAnsi(output).includes('exited'));
});

test('useAnimation can drive explicitly non-interactive process exit', async (t: TestContext) => {
	const output = await runNonTtyFixture('use-animation-interactive-false-exit');

	t.assert.ok(stripAnsi(output).includes('exited'));
});

test('#450: full-height rerenders with <Static> should not repeatedly clear terminal', async (t: TestContext) => {
	const {output, fullClearCount, eraseLineCount} =
		await runIssue450FixtureWithCounts(
			'issue-450-full-height-with-static-rerender',
		);

	t.assert.ok(
		output.includes('#450 static line'),
		'Fixture should emit static output',
	);
	assertIssue450DynamicFrameOutput(t, output);
	t.assert.ok(
		fullClearCount <= 1,
		`Expected at most one full-clear sequence, received ${fullClearCount}`,
	);
	t.assert.ok(
		eraseLineCount > 0,
		'Expected incremental erase sequences for fullscreen rerenders',
	);
});

test('clear output', async (t: TestContext) => {
	const ps = term('clear');
	await ps.waitForExit();

	const secondFrame = ps.output.split(ansiEscapes.eraseLines(4))[1];

	for (const letter of ['A', 'B', 'C']) {
		t.assert.strictEqual(secondFrame?.includes(letter), false);
	}
});

for (const mode of ['standard', 'incremental', 'screen-reader']) {
	test(`preserve terminal history when rerendering after clear - ${mode}`, async (t: TestContext) => {
		const stdout = createStdout();
		stdout.write('History\n');
		const instance = render(<Text>{'First\nSecond'}</Text>, {
			stdout,
			interactive: true,
			patchConsole: false,
			incrementalRendering: mode === 'incremental',
			isScreenReaderEnabled: mode === 'screen-reader',
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		const visibleLines = () =>
			reconstructTerminalLines(
				stdout.getWrites().join('').replaceAll('\n', '\r\n'),
				100,
			).filter(Boolean);

		instance.clear();
		t.assert.deepStrictEqual(visibleLines(), ['History']);
		instance.clear();
		t.assert.deepStrictEqual(visibleLines(), ['History']);
		instance.rerender(<Text>Updated</Text>);
		await instance.waitUntilRenderFlush();

		t.assert.deepStrictEqual(visibleLines(), ['History', 'Updated']);
	});
}

const staticHistoryItems = ['S1', 'S2', 'S3'];

type StaticHistoryProps = {
	readonly liveLines: number;
	readonly tick: number;
	readonly items?: string[];
};

function StaticHistoryApp({
	liveLines,
	tick,
	items = staticHistoryItems,
}: StaticHistoryProps) {
	const lines = [];
	for (let index = 0; index < liveLines; index++) {
		lines.push(<Text key={index}>{`live ${index} tick ${tick}`}</Text>);
	}

	return (
		<>
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
			<Box flexDirection="column">{lines}</Box>
		</>
	);
}

for (const mode of ['standard', 'incremental']) {
	test(`full clears do not replay <Static> output into scrollback - ${mode}`, async (t: TestContext) => {
		const rows = 4;
		const stdout = createStdout();
		stdout.rows = rows;
		stdout.write('History\n');
		const instance = render(
			<StaticHistoryApp liveLines={rows + 2} tick={0} />,
			{
				stdout,
				interactive: true,
				patchConsole: false,
				incrementalRendering: mode === 'incremental',
			},
		);
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		// Every overflowing rerender goes through the full-clear path, and so does
		// the final shrink back below the viewport.
		instance.rerender(<StaticHistoryApp liveLines={rows + 2} tick={1} />);
		await instance.waitUntilRenderFlush();
		instance.rerender(<StaticHistoryApp liveLines={rows + 2} tick={2} />);
		await instance.waitUntilRenderFlush();
		instance.rerender(<StaticHistoryApp liveLines={1} tick={3} />);
		await instance.waitUntilRenderFlush();

		const output = stdout.getWrites().join('');
		t.assert.ok(
			countOccurrences(output, homeAndEraseDown) >= 3,
			'Expected the rerenders to go through the full-clear path',
		);

		const terminalLines = reconstructTerminalLines(
			output.replaceAll('\n', '\r\n'),
			rows,
		);
		const scrollbackLines = terminalLines.slice(0, -rows).filter(Boolean);
		const viewportLines = terminalLines.slice(-rows).filter(Boolean);

		// The full clear only erases the previous frame, so the <Static> lines and
		// the history above them are written exactly once and stay in scrollback.
		t.assert.deepStrictEqual(scrollbackLines.slice(0, 4), [
			'History',
			'S1',
			'S2',
			'S3',
		]);
		for (const item of ['S1', 'S2', 'S3']) {
			t.assert.strictEqual(
				terminalLines.filter(line => line === item).length,
				1,
				`Expected static item ${item} to be written once`,
			);
		}

		// The final frame is the only thing left in the viewport.
		t.assert.deepStrictEqual(viewportLines, ['live 0 tick 3']);
	});

	test(`growing into an overflowing frame keeps <Static> rows that are still in the viewport - ${mode}`, async (t: TestContext) => {
		const rows = 3;
		const stdout = createStdout();
		stdout.rows = rows;
		stdout.write('History\n');
		// With a one-line live region and three rows, `History`, `S1` and `S2`
		// have scrolled into scrollback; only `S3` is still in the viewport.
		const instance = render(<StaticHistoryApp liveLines={1} tick={0} />, {
			stdout,
			interactive: true,
			patchConsole: false,
			incrementalRendering: mode === 'incremental',
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		instance.rerender(<StaticHistoryApp liveLines={rows + 2} tick={1} />);
		await instance.waitUntilRenderFlush();

		const output = stdout.getWrites().join('');
		t.assert.strictEqual(
			output.includes(homeAndEraseDown),
			false,
			'Growing from a frame that did not fill the viewport must not erase the viewport',
		);

		const visibleLines = reconstructTerminalLines(
			output.replaceAll('\n', '\r\n'),
			rows,
		).filter(Boolean);

		t.assert.deepStrictEqual(visibleLines, [
			'History',
			'S1',
			'S2',
			'S3',
			'live 0 tick 1',
			'live 1 tick 1',
			'live 2 tick 1',
			'live 3 tick 1',
			'live 4 tick 1',
		]);
	});

	test(`<Static> items added while the frame overflows are written once - ${mode}`, async (t: TestContext) => {
		const rows = 4;
		const stdout = createStdout();
		stdout.rows = rows;
		const instance = render(
			<StaticHistoryApp items={['S1']} liveLines={rows + 2} tick={0} />,
			{
				stdout,
				interactive: true,
				patchConsole: false,
				incrementalRendering: mode === 'incremental',
			},
		);
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		// Both rerenders go through the full-clear path and each one carries a
		// new <Static> item, which must still reach the terminal.
		instance.rerender(
			<StaticHistoryApp items={['S1', 'S2']} liveLines={rows + 2} tick={1} />,
		);
		await instance.waitUntilRenderFlush();
		instance.rerender(
			<StaticHistoryApp
				items={['S1', 'S2', 'S3']}
				liveLines={rows + 2}
				tick={2}
			/>,
		);
		await instance.waitUntilRenderFlush();

		const output = stdout.getWrites().join('');
		t.assert.ok(
			countOccurrences(output, homeAndEraseDown) >= 2,
			'Expected the rerenders to go through the full-clear path',
		);

		const terminalLines = reconstructTerminalLines(
			output.replaceAll('\n', '\r\n'),
			rows,
		).filter(Boolean);

		t.assert.deepStrictEqual(
			terminalLines.filter(line => line.startsWith('S')),
			['S1', 'S2', 'S3'],
			'Expected every static item to be written exactly once, in order',
		);
	});
}

for (const mode of ['standard', 'incremental']) {
	test(`alternate screen replays <Static> output when the frame shrinks after overflowing - ${mode}`, async (t: TestContext) => {
		// Enough rows for the three static lines, the live line and the row its trailing newline leaves the cursor on, so the first frame does not scroll.
		const rows = 5;
		const stdout = createStdout();
		stdout.rows = rows;
		const instance = render(<StaticHistoryApp liveLines={1} tick={0} />, {
			stdout,
			interactive: true,
			alternateScreen: true,
			patchConsole: false,
			incrementalRendering: mode === 'incremental',
		});
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		// The alternate screen has no scrollback, so the <Static> rows that the overflowing frame pushes off the top are gone once the frame shrinks unless they are replayed.
		instance.rerender(<StaticHistoryApp liveLines={rows + 2} tick={1} />);
		await instance.waitUntilRenderFlush();
		instance.rerender(<StaticHistoryApp liveLines={1} tick={2} />);
		await instance.waitUntilRenderFlush();

		// Reconstruct only what the last full clear left on screen, so a replay that writes the static rows twice cannot hide the first copy above the viewport.
		const output = stdout.getWrites().join('');
		const lastClear = output.lastIndexOf(homeAndEraseDown);
		t.assert.ok(
			lastClear >= 0,
			'Expected the shrink to go through the full-clear path',
		);

		t.assert.deepStrictEqual(
			reconstructTerminalLines(
				output.slice(lastClear).replaceAll('\n', '\r\n'),
				rows,
			),
			['S1', 'S2', 'S3', 'live 0 tick 2', ''],
		);
	});

	test(`alternate screen replays <Static> items added while the frame overflows once - ${mode}`, async (t: TestContext) => {
		const rows = 5;
		const stdout = createStdout();
		stdout.rows = rows;
		const instance = render(
			<StaticHistoryApp items={['S1']} liveLines={rows + 2} tick={0} />,
			{
				stdout,
				interactive: true,
				alternateScreen: true,
				patchConsole: false,
				incrementalRendering: mode === 'incremental',
			},
		);
		t.after(() => {
			instance.unmount();
		});
		await instance.waitUntilRenderFlush();

		// Each overflowing rerender adds a <Static> item that the replay must carry exactly once, both while the frame overflows and after it shrinks.
		instance.rerender(
			<StaticHistoryApp items={['S1', 'S2']} liveLines={rows + 2} tick={1} />,
		);
		await instance.waitUntilRenderFlush();
		instance.rerender(
			<StaticHistoryApp
				items={['S1', 'S2', 'S3']}
				liveLines={rows + 2}
				tick={2}
			/>,
		);
		await instance.waitUntilRenderFlush();
		instance.rerender(
			<StaticHistoryApp items={['S1', 'S2', 'S3']} liveLines={1} tick={3} />,
		);
		await instance.waitUntilRenderFlush();

		// Check the static rows every full clear writes, not just what ends up on screen, since an overflowing frame scrolls a duplicate off the top before it can be seen.
		const frames = stdout.getWrites().join('').split(homeAndEraseDown).slice(1);
		t.assert.ok(
			frames.length >= 3,
			'Expected the rerenders to go through the full-clear path',
		);
		for (const frame of frames) {
			const staticLines = frame
				.split('\n')
				.filter(line => line.startsWith('S'));
			t.assert.deepStrictEqual(
				staticLines,
				['S1', 'S2', 'S3'].slice(0, staticLines.length),
				'Expected every static item to be written exactly once, in order',
			);
		}

		t.assert.deepStrictEqual(
			reconstructTerminalLines(frames.at(-1)!.replaceAll('\n', '\r\n'), rows),
			['S1', 'S2', 'S3', 'live 0 tick 3', ''],
		);
	});
}

test('clear screen-reader output', (t: TestContext) => {
	const stdout = createStdout(10);
	const instance = render(<Text>{'First line\nSecond line'}</Text>, {
		stdout,
		interactive: true,
		isScreenReaderEnabled: true,
		patchConsole: false,
	});
	t.after(() => {
		instance.unmount();
	});

	const visibleLines = () =>
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			10,
		).filter(Boolean);

	t.assert.deepStrictEqual(visibleLines(), ['First line', 'Second', 'line']);
	instance.clear();
	t.assert.deepStrictEqual(visibleLines(), []);
});

test('preserve screen-reader output around stdout writes', (t: TestContext) => {
	const stdout = createStdout();
	let write: (text: string) => void = () => {};
	function Test() {
		({write} = useStdout());
		return <Text>{'First line\nSecond line'}</Text>;
	}

	const instance = render(<Test />, {
		stdout,
		interactive: true,
		isScreenReaderEnabled: true,
		patchConsole: false,
	});
	t.after(() => {
		instance.unmount();
	});

	write('Log message\n');

	t.assert.deepStrictEqual(
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			10,
		).filter(Boolean),
		['Log message', 'First line', 'Second line'],
	);
});

test('replace restored screen-reader output after clear and stdout write', async (t: TestContext) => {
	const stdout = createStdout(10);
	let write: (text: string) => void = () => {};
	function Test() {
		({write} = useStdout());
		return <Text>First Second Third</Text>;
	}

	const instance = render(<Test />, {
		stdout,
		interactive: true,
		isScreenReaderEnabled: true,
		patchConsole: false,
	});
	t.after(() => {
		instance.unmount();
	});
	await instance.waitUntilRenderFlush();

	instance.clear();
	write('Log\n');
	instance.rerender(<Text>Updated</Text>);
	await instance.waitUntilRenderFlush();

	t.assert.deepStrictEqual(
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			10,
		).filter(Boolean),
		['Log', 'Updated'],
	);
});

test('replace screen-reader output ending in a newline after stdout write', async (t: TestContext) => {
	const stdout = createStdout();
	let write: (text: string) => void = () => {};
	function Test() {
		({write} = useStdout());
		return <Text>{'First\n'}</Text>;
	}

	const instance = render(<Test />, {
		stdout,
		interactive: true,
		isScreenReaderEnabled: true,
		patchConsole: false,
	});
	t.after(() => {
		instance.unmount();
	});
	await instance.waitUntilRenderFlush();

	write('Log\n');
	instance.rerender(<Text>Updated</Text>);
	await instance.waitUntilRenderFlush();

	t.assert.deepStrictEqual(
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			100,
		).filter(Boolean),
		['Log', 'Updated'],
	);
});

test('preserve static history when screen-reader output resizes', (t: TestContext) => {
	const stdout = createStdout(20);
	const instance = render(
		<>
			<Static items={['History']}>
				{item => <Text key={item}>{item}</Text>}
			</Static>
			<Text>{'First line\nSecond line'}</Text>
		</>,
		{
			stdout,
			interactive: true,
			isScreenReaderEnabled: true,
			patchConsole: false,
		},
	);
	t.after(() => {
		instance.unmount();
	});

	stdout.columns = 10;
	stdout.emit('resize');

	t.assert.deepStrictEqual(
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			10,
		).filter(Boolean),
		['History', 'First line', 'Second', 'line'],
	);
});

test('rewrap screen-reader output when the terminal gets wider', (t: TestContext) => {
	const stdout = createStdout(10);
	const instance = render(<Text>Hello world</Text>, {
		stdout,
		interactive: true,
		isScreenReaderEnabled: true,
		patchConsole: false,
	});
	t.after(() => {
		instance.unmount();
	});

	const visibleLines = () =>
		reconstructTerminalLines(
			stdout.getWrites().join('').replaceAll('\n', '\r\n'),
			10,
		).filter(Boolean);

	t.assert.deepStrictEqual(visibleLines(), ['Hello', 'world']);
	stdout.columns = 20;
	stdout.emit('resize');
	t.assert.deepStrictEqual(visibleLines(), ['Hello world']);
});

for (const patchConsoleOption of ['omitted', 'undefined']) {
	test(`intercept console methods with ${patchConsoleOption} patchConsole option`, async (t: TestContext) => {
		const ps = term('console', [patchConsoleOption]);
		await ps.waitForExit();

		const frames = ps.output
			.split(ansiEscapes.eraseLines(2))
			.map(line => stripAnsi(line));

		t.assert.deepStrictEqual(frames, [
			'Hello World\r\n',
			'First log\r\nHello World\r\nSecond log\r\n',
		]);
	});
}

test('update trailing newline when unchanged output becomes fullscreen', async (t: TestContext) => {
	const stdout = createStdout();
	stdout.rows = 24;
	const instance = render(<Text>{'First\nSecond'}</Text>, {
		stdout,
		interactive: true,
		patchConsole: false,
	});
	t.after(() => {
		instance.unmount();
	});
	await instance.waitUntilRenderFlush();
	t.assert.strictEqual(
		stripAnsi(getContentWrites(stdout.write).at(-1)!),
		'First\nSecond\n',
	);

	stdout.rows = 2;
	stdout.emit('resize');
	await instance.waitUntilRenderFlush();
	t.assert.strictEqual(
		stripAnsi(getContentWrites(stdout.write).at(-1)!),
		'First\nSecond',
	);
});

test('rerender on resize', async (t: TestContext) => {
	const stdout = createStdout(10);

	function Test() {
		return (
			<Box borderStyle="round">
				<Text>Test</Text>
			</Box>
		);
	}

	const {unmount} = render(<Test />, {stdout});

	const contentWrites = getContentWrites(stdout.write);
	t.assert.strictEqual(
		stripAnsi(contentWrites[0]!),
		boxen('Test'.padEnd(8), {borderStyle: 'round'}) + '\n',
	);

	t.assert.strictEqual(stdout.listeners('resize').length, 1);

	stdout.columns = 8;
	stdout.emit('resize');
	await delay(100);

	const contentWritesAfterResize = getContentWrites(stdout.write);
	t.assert.strictEqual(
		stripAnsi(contentWritesAfterResize.at(-1)!),
		boxen('Test'.padEnd(6), {borderStyle: 'round'}) + '\n',
	);

	unmount();
	t.assert.strictEqual(stdout.listeners('resize').length, 0);
});

function ThrottleTestComponent({text}: {readonly text: string}) {
	return <Text>{text}</Text>;
}

function ThrottleCursorTestComponent({text}: {readonly text: string}) {
	const {setCursorPosition} = useCursor();
	setCursorPosition({x: 0, y: 0});
	return <Text>{text}</Text>;
}

test('throttle renders to maxFps', (t: TestContext) => {
	// `node:test` reports results through `process.nextTick`, so faking it silently drops the results of later tests in this file.
	const clock = FakeTimers.install({toNotFake: ['nextTick']}); // Controls timers + Date.now()
	try {
		const stdout = createStdout();

		const {unmount, rerender} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1, // 1 Hz => ~1000 ms window
		});

		// Initial render (leading call)
		t.assert.strictEqual(getContentWrites(stdout.write).length, 1);
		t.assert.strictEqual(
			stripAnsi(getContentWrites(stdout.write)[0]!),
			'Hello\n',
		);

		// Trigger another render inside the throttle window
		rerender(<ThrottleTestComponent text="World" />);
		t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

		// Advance 999 ms: still within window, no trailing call yet
		clock.tick(999);
		t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

		// Cross the boundary: trailing render fires once
		clock.tick(1);
		t.assert.strictEqual(getContentWrites(stdout.write).length, 2);
		t.assert.strictEqual(
			stripAnsi(getContentWrites(stdout.write)[1]!),
			'World\n',
		);

		unmount();
	} finally {
		clock.uninstall();
	}
});

test('outputs renderTime when onRender is passed', async (t: TestContext) => {
	const renderTimes: number[] = [];
	const funcObject = {
		onRender(metrics: RenderMetrics) {
			const {renderTime} = metrics;
			renderTimes.push(renderTime);
		},
	};

	const onRenderStub = stub(funcObject, 'onRender').callThrough();

	function Test({children}: {readonly children?: ReactNode}) {
		const [text, setText] = useState('Test');

		useInput(input => {
			setText(input);
		});

		return (
			<Box borderStyle="round">
				<Text>{text}</Text>
				{children}
			</Box>
		);
	}

	const stdin = createStdin();
	const {unmount, rerender} = render(<Test />, {
		onRender: onRenderStub,
		stdin,
	});

	// Initial render
	t.assert.strictEqual(onRenderStub.callCount, 1);
	t.assert.ok(renderTimes[0] >= 0);

	// Manual rerender
	onRenderStub.resetHistory();
	rerender(
		<Test>
			<Text>Updated</Text>
		</Test>,
	);
	await delay(100);
	t.assert.strictEqual(onRenderStub.callCount, 1);
	t.assert.ok(renderTimes[1] >= 0);

	// Internal state update via useInput
	onRenderStub.resetHistory();
	emitReadable(stdin, 'a');
	await delay(100);
	t.assert.strictEqual(onRenderStub.callCount, 1);
	t.assert.ok(renderTimes[2] >= 0);

	// Verify all renders were tracked
	t.assert.strictEqual(renderTimes.length, 3);

	unmount();
});

test('no throttled renders after unmount', (t: TestContext) => {
	const clock = FakeTimers.install({toNotFake: ['nextTick']});
	try {
		const stdout = createStdout();

		const {unmount, rerender} = render(<ThrottleTestComponent text="Foo" />, {
			stdout,
		});

		t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

		rerender(<ThrottleTestComponent text="Bar" />);
		rerender(<ThrottleTestComponent text="Baz" />);
		unmount();

		const contentCountAfterUnmount = getContentWrites(stdout.write).length;

		// Regression test for https://github.com/vadimdemedes/ink/issues/692
		clock.tick(1000);
		t.assert.strictEqual(
			getContentWrites(stdout.write).length,
			contentCountAfterUnmount,
		);
	} finally {
		clock.uninstall();
	}
});

test('unmount forces pending throttled render', (t: TestContext) => {
	const clock = FakeTimers.install({toNotFake: ['nextTick']});
	try {
		const stdout = createStdout();

		const {unmount, rerender} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1, // 1 Hz => ~1000 ms throttle window
		});

		// Initial render (leading call)
		t.assert.strictEqual(getContentWrites(stdout.write).length, 1);
		t.assert.strictEqual(
			stripAnsi(getContentWrites(stdout.write)[0]!),
			'Hello\n',
		);

		// Trigger another render inside the throttle window
		rerender(<ThrottleTestComponent text="Final" />);
		// Not rendered yet due to throttling
		t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

		// Unmount should flush the pending render so the final frame is visible
		unmount();

		// The final frame should have been rendered
		const allContentWrites = getContentWrites(stdout.write).map((w: string) =>
			stripAnsi(w),
		);
		t.assert.ok(
			allContentWrites.some((call: string) => call.includes('Final')),
		);
	} finally {
		clock.uninstall();
	}
});

test('should reject waitUntilExit when app exits during synchronous render error handling', async (t: TestContext) => {
	const stdout = createStdout();
	const {waitUntilExit} = render(<ThrowingComponentWithBoundary />, {
		stdout,
		patchConsole: false,
	});

	await t.assert.rejects(
		Promise.race([
			waitUntilExit(),
			delay(500).then(() => {
				throw new Error('waitUntilExit did not settle');
			}),
		]),
		{
			message: 'Synchronous render error',
		},
	);
});

test('waitUntilExit resolves after stdout write callback', async (t: TestContext) => {
	let didWriteCallbackFire = false;

	const stdout = new Writable({
		write(_chunk, _encoding, callback) {
			setTimeout(() => {
				didWriteCallbackFire = true;
				callback();
			}, 150);
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {stdout});
	const exitPromise = waitUntilExit();

	unmount();
	await exitPromise;

	t.assert.ok(didWriteCallbackFire);
});

test('waitUntilRenderFlush waits for generic stdout write callback', async (t: TestContext) => {
	let writeCallbackCount = 0;
	const stdout = createCallbackWritableStream(() => {
		writeCallbackCount++;
	});

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(
		<Text>Hello</Text>,
		{
			stdout,
			interactive: false,
			patchConsole: false,
		},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	t.assert.strictEqual(writeCallbackCount, 1);

	unmount();
	await waitUntilExit();

	t.assert.strictEqual(writeCallbackCount, 3);
});

test('createDelayedWriteCallbackStdout delays only the first matching chunk', async (t: TestContext) => {
	let delayCount = 0;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return !isWriteBarrierChunk(chunk);
		},
		onDelayElapsed() {
			delayCount++;
		},
		delayMs: 80,
	});

	const writeChunk = async (chunk: string | Uint8Array): Promise<void> =>
		new Promise<void>(resolve => {
			stdout.write(chunk, () => {
				resolve();
			});
		});

	await writeChunk('');
	t.assert.strictEqual(delayCount, 0);

	let didDelayedWriteResolve = false;
	const delayedWritePromise = (async () => {
		await writeChunk('Hello');
		didDelayedWriteResolve = true;
	})();

	await delay(20);
	t.assert.strictEqual(didDelayedWriteResolve, false);
	await delayedWritePromise;
	t.assert.strictEqual(delayCount, 1);

	let didImmediateWriteResolve = false;
	const immediateWritePromise = (async () => {
		await writeChunk('World');
		didImmediateWriteResolve = true;
	})();

	await delay(0);
	t.assert.ok(didImmediateWriteResolve);
	await immediateWritePromise;
	t.assert.strictEqual(delayCount, 1);
});

test('waitUntilRenderFlush resolves after stdout write callback', async (t: TestContext) => {
	let didInitialWriteCallbackFire = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return !isWriteBarrierChunk(chunk);
		},
		onDelayElapsed() {
			didInitialWriteCallbackFire = true;
		},
	});

	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(
		<Text>Hello</Text>,
		{
			stdout,
		},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();

	t.assert.ok(didInitialWriteCallbackFire);
});

test('waitUntilRenderFlush flushes pending throttled render', async (t: TestContext) => {
	const stdout = createStdout();
	const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
		<ThrottleTestComponent text="Hello" />,
		{
			stdout,
			maxFps: 1,
		},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

	rerender(<ThrottleTestComponent text="World" />);
	t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

	await waitUntilRenderFlush();

	t.assert.strictEqual(getContentWrites(stdout.write).length, 2);
	t.assert.strictEqual(
		stripAnsi(getContentWrites(stdout.write)[1]!),
		'World\n',
	);
});

test('waitUntilRenderFlush resolves when stdout is not writable', async (t: TestContext) => {
	const stdout = createStdout();
	const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
		<ThrottleTestComponent text="Hello" />,
		{
			stdout,
			maxFps: 1,
		},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

	rerender(<ThrottleTestComponent text="World" />);
	t.assert.strictEqual(getContentWrites(stdout.write).length, 1);

	(stdout as NodeJS.WriteStream & {writable?: boolean}).writable = false;
	await waitUntilRenderFlush();

	t.assert.strictEqual(getContentWrites(stdout.write).length, 1);
});

test('waitUntilRenderFlush waits for rerender write callback', async (t: TestContext) => {
	let didSecondWriteCallbackFire = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return (
				!isWriteBarrierChunk(chunk) && toRenderedChunk(chunk).includes('World')
			);
		},
		onDelayElapsed() {
			didSecondWriteCallbackFire = true;
		},
	});

	const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
		<Text>Hello</Text>,
		{stdout},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();
	rerender(<Text>World</Text>);
	await waitUntilRenderFlush();

	t.assert.ok(didSecondWriteCallbackFire);
});

test('waitUntilRenderFlush waits for concurrent rerender commit', async (t: TestContext) => {
	let renderedOutput = '';

	const stdout = new Writable({
		write(
			chunk: string | Uint8Array,
			_encoding: BufferEncoding,
			callback: (error?: Error) => void,
		) {
			renderedOutput += toRenderedChunk(chunk);
			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;
	stdout.isTTY = true;

	const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
		<Text>Hello</Text>,
		{
			stdout,
			concurrent: true,
		},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();
	rerender(<Text>World</Text>);
	await waitUntilRenderFlush();

	t.assert.ok(renderedOutput.includes('World'));
});

test('waitUntilRenderFlush waits for all concurrent waiters on the same rerender', async (t: TestContext) => {
	let didWorldWriteCallbackFire = false;
	let didAnyWaiterResolveBeforeWorldWriteCallback = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return (
				!isWriteBarrierChunk(chunk) && toRenderedChunk(chunk).includes('World')
			);
		},
		onDelayElapsed() {
			didWorldWriteCallbackFire = true;
		},
	});

	const {unmount, rerender, waitUntilExit, waitUntilRenderFlush} = render(
		<Text>Hello</Text>,
		{stdout},
	);

	t.after(async () => {
		unmount();
		await waitUntilExit();
	});

	await waitUntilRenderFlush();
	rerender(<Text>World</Text>);

	const waitForFlush = async () => {
		await waitUntilRenderFlush();

		if (!didWorldWriteCallbackFire) {
			didAnyWaiterResolveBeforeWorldWriteCallback = true;
		}
	};

	await Promise.all([waitForFlush(), waitForFlush()]);

	t.assert.ok(didWorldWriteCallbackFire);
	t.assert.strictEqual(didAnyWaiterResolveBeforeWorldWriteCallback, false);
});

test('useApp waitUntilRenderFlush resolves after the first frame write callback', async (t: TestContext) => {
	let didInitialWriteCallbackFire = false;
	let didWaitUntilRenderFlushResolve = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return !isWriteBarrierChunk(chunk);
		},
		onDelayElapsed() {
			didInitialWriteCallbackFire = true;
		},
	});

	function Test() {
		const {exit, waitUntilRenderFlush} = useApp();

		useEffect(() => {
			void (async () => {
				await waitUntilRenderFlush();
				didWaitUntilRenderFlushResolve = true;
				exit();
			})();
		}, [exit, waitUntilRenderFlush]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout});
	await waitUntilExit();

	t.assert.ok(didInitialWriteCallbackFire);
	t.assert.ok(didWaitUntilRenderFlushResolve);
});

test('useApp waitUntilRenderFlush waits for state update frame flush', async (t: TestContext) => {
	let didWorldWriteCallbackFire = false;
	let didWaitUntilRenderFlushResolve = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return (
				!isWriteBarrierChunk(chunk) && toRenderedChunk(chunk).includes('World')
			);
		},
		onDelayElapsed() {
			didWorldWriteCallbackFire = true;
		},
	});

	function Test() {
		const {exit, waitUntilRenderFlush} = useApp();
		const [text, setText] = useState('Hello');

		useEffect(() => {
			setText('World');
		}, []);

		useEffect(() => {
			if (text !== 'World') {
				return;
			}

			void (async () => {
				await waitUntilRenderFlush();
				didWaitUntilRenderFlushResolve = true;
				exit();
			})();
		}, [exit, text, waitUntilRenderFlush]);

		return <Text>{text}</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout});
	await waitUntilExit();

	t.assert.ok(didWorldWriteCallbackFire);
	t.assert.ok(didWaitUntilRenderFlushResolve);
});

test('useApp waitUntilRenderFlush waits for state update queued in same effect tick', async (t: TestContext) => {
	let didWorldWriteCallbackFire = false;
	let didWaitUntilRenderFlushResolveBeforeWorldWrite = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return (
				!isWriteBarrierChunk(chunk) && toRenderedChunk(chunk).includes('World')
			);
		},
		onDelayElapsed() {
			didWorldWriteCallbackFire = true;
		},
	});

	function Test() {
		const {exit, waitUntilRenderFlush} = useApp();
		const [text, setText] = useState('Hello');

		useEffect(() => {
			void (async () => {
				setText('World');
				await waitUntilRenderFlush();

				if (!didWorldWriteCallbackFire) {
					didWaitUntilRenderFlushResolveBeforeWorldWrite = true;
				}

				exit();
			})();
		}, [exit, waitUntilRenderFlush]);

		return <Text>{text}</Text>;
	}

	const {waitUntilExit} = render(<Test />, {
		stdout,
		concurrent: true,
	});
	await waitUntilExit();

	t.assert.ok(didWorldWriteCallbackFire);
	t.assert.strictEqual(didWaitUntilRenderFlushResolveBeforeWorldWrite, false);
});

// eslint-disable-next-line node-test/require-assertion -- Passes when the promise resolves.
test('waitUntilRenderFlush resolves after unmount', async () => {
	const stdout = createStdout();
	const {unmount, waitUntilExit, waitUntilRenderFlush} = render(
		<Text>Hello</Text>,
		{
			stdout,
		},
	);

	unmount();
	await waitUntilExit();
	await waitUntilRenderFlush();
});

test('waitUntilRenderFlush waits for unmount write callback', async (t: TestContext) => {
	let didUnmountWriteCallbackFire = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return isWriteBarrierChunk(chunk);
		},
		onDelayElapsed() {
			didUnmountWriteCallbackFire = true;
		},
	});

	const {unmount, waitUntilRenderFlush} = render(<Text>Hello</Text>, {
		stdout,
	});

	unmount();
	await waitUntilRenderFlush();

	t.assert.ok(didUnmountWriteCallbackFire);
});

test('waitUntilExit after unmount does not retain a beforeExit listener', async (t: TestContext) => {
	const existingListeners = process.listeners('beforeExit');
	t.after(() => {
		for (const listener of process.listeners('beforeExit')) {
			if (!existingListeners.includes(listener)) {
				process.off('beforeExit', listener);
			}
		}
	});

	const instance = render(<Text>Hello</Text>, {
		stdout: createStdout(),
		patchConsole: false,
	});
	instance.unmount();
	await instance.waitUntilExit();

	t.assert.deepStrictEqual(process.listeners('beforeExit'), existingListeners);
});

test('waitUntilRenderFlush after unmount does not register beforeExit listener', async (t: TestContext) => {
	const stdout = createStdout();
	const {unmount, waitUntilRenderFlush} = render(<Text>Hello</Text>, {
		stdout,
	});
	const beforeWaitListenerCount = process.listenerCount('beforeExit');

	unmount();
	await waitUntilRenderFlush();

	t.assert.strictEqual(
		process.listenerCount('beforeExit'),
		beforeWaitListenerCount,
	);
});

test('waitUntilRenderFlush resolves after exit with error', async (t: TestContext) => {
	const stdout = createStdout();

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			exit(new Error('boom'));
		}, [exit]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit, waitUntilRenderFlush} = render(<Test />, {stdout});

	// Verify exit rejects with the error.
	await t.assert.rejects(waitUntilExit(), {message: 'boom'});

	// Flush must resolve (not reject) even after an error exit.
	await waitUntilRenderFlush();
});

test('issue 596: useEffect can run before the first frame write callback', async (t: TestContext) => {
	let didInitialWriteCallbackFire = false;
	let didUseEffectRun = false;

	const stdout = createDelayedWriteCallbackStdout({
		shouldDelay(chunk) {
			return !isWriteBarrierChunk(chunk);
		},
		onDelayElapsed() {
			didInitialWriteCallbackFire = true;
		},
	});

	function Test() {
		useEffect(() => {
			didUseEffectRun = true;
		}, []);

		return <Text>Hello</Text>;
	}

	const {unmount, waitUntilExit} = render(<Test />, {stdout});

	await delay(20);
	t.assert.ok(didUseEffectRun);
	t.assert.strictEqual(didInitialWriteCallbackFire, false);

	unmount();
	await waitUntilExit();

	t.assert.ok(didInitialWriteCallbackFire);
});

test('waitUntilExit resolves first exit value when duplicate exits happen during teardown', async (t: TestContext) => {
	let barrierWriteCallback: (() => void) | undefined;

	const stdout = new Writable({
		write(
			chunk: string | Uint8Array,
			_encoding: BufferEncoding,
			callback: (error?: Error) => void,
		) {
			if (isWriteBarrierChunk(chunk)) {
				barrierWriteCallback = callback;
				return;
			}

			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			exit('first');
			// eslint-disable-next-line @eslint-react/web-api-no-leaked-timeout -- The second exit must run after the first exit unmounts the app, so it cannot be cleared on unmount.
			setTimeout(() => {
				exit('second');
			}, 0);
		}, [exit]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout});
	const exitPromise = waitUntilExit();

	await delay(0);

	if (!barrierWriteCallback) {
		t.assert.fail('Expected unmount to queue a write barrier callback');
		return;
	}

	barrierWriteCallback();
	const result = await exitPromise;
	t.assert.strictEqual(result, 'first');
});

test('waitUntilExit resolves first exit value when exit is re-entered during unmount writes', async (t: TestContext) => {
	let exit: ((errorOrResult?: unknown) => void) | undefined;
	let shouldReenterExit = false;
	let didReenterExit = false;

	const stdout = new Writable({
		write(_chunk, _encoding, callback) {
			if (shouldReenterExit && !didReenterExit && exit) {
				didReenterExit = true;
				exit('second');
			}

			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;
	stdout.isTTY = true;

	function Test() {
		const {exit: appExit} = useApp();

		useEffect(() => {
			exit = appExit;
			shouldReenterExit = true;
			appExit('first');
		}, [appExit]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout});
	const result = await waitUntilExit();

	t.assert.ok(didReenterExit);
	t.assert.strictEqual(result, 'first');
});

test('waitUntilExit resolves first exit value when exit is re-entered during unmount writes in debug mode', async (t: TestContext) => {
	let exit: ((errorOrResult?: unknown) => void) | undefined;
	let shouldReenterExit = false;
	let didReenterExit = false;

	const stdout = new Writable({
		write(_chunk, _encoding, callback) {
			if (shouldReenterExit && !didReenterExit && exit) {
				didReenterExit = true;
				exit('second');
			}

			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;
	stdout.isTTY = true;

	function Test() {
		const {exit: appExit} = useApp();

		useEffect(() => {
			exit = appExit;
			shouldReenterExit = true;
			appExit('first');
		}, [appExit]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout, debug: true});
	const result = await waitUntilExit();

	t.assert.ok(didReenterExit);
	t.assert.strictEqual(result, 'first');
});

test('waitUntilExit resolves first exit value when exit is re-entered during unmount writes with screen reader', async (t: TestContext) => {
	let exit: ((errorOrResult?: unknown) => void) | undefined;
	let shouldReenterExit = false;
	let didReenterExit = false;

	const stdout = new Writable({
		write(_chunk, _encoding, callback) {
			if (shouldReenterExit && !didReenterExit && exit) {
				didReenterExit = true;
				exit('second');
			}

			callback();
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;
	stdout.isTTY = true;

	function Test() {
		const {exit: appExit} = useApp();

		useEffect(() => {
			exit = appExit;
			shouldReenterExit = true;
			appExit('first');
		}, [appExit]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {
		stdout,
		isScreenReaderEnabled: true,
		patchConsole: false,
	});
	const result = await waitUntilExit();

	t.assert.ok(didReenterExit);
	t.assert.strictEqual(result, 'first');
});

test('exit rejects on cross-realm Error', async (t: TestContext) => {
	const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
	stdout.columns = 100;

	const foreignError = vm.runInNewContext("new Error('boom')") as Error;

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			const timer = setTimeout(() => {
				exit(foreignError);
			}, 0);

			return () => {
				clearTimeout(timer);
			};
		}, [exit]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout, patchConsole: false});

	await t.assert.rejects(waitUntilExit(), {
		message: 'boom',
	});
});

test('exit with cross-realm Error rejects after stdout write callback', async (t: TestContext) => {
	let didWriteCallbackFire = false;
	let didBarrierWriteCallbackFire = false;

	const stdout = new Writable({
		write(chunk: string | Uint8Array, _encoding, callback) {
			setTimeout(() => {
				didWriteCallbackFire = true;

				if (isWriteBarrierChunk(chunk)) {
					didBarrierWriteCallbackFire = true;
				}

				callback();
			}, 150);
		},
	}) as unknown as NodeJS.WriteStream;

	stdout.columns = 100;

	const foreignError = vm.runInNewContext("new Error('boom')") as Error;

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			const timer = setTimeout(() => {
				exit(foreignError);
			}, 0);

			return () => {
				clearTimeout(timer);
			};
		}, [exit]);

		return <Text>Hello</Text>;
	}

	const {waitUntilExit} = render(<Test />, {stdout, patchConsole: false});

	await t.assert.rejects(waitUntilExit(), {
		message: 'boom',
	});

	t.assert.ok(didWriteCallbackFire);
	t.assert.ok(didBarrierWriteCallbackFire);
});

test('unmount does not write to ended stdout stream', async (t: TestContext) => {
	const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
	stdout.columns = 100;

	const writeErrors: Error[] = [];
	stdout.on('error', error => {
		writeErrors.push(error);
	});

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {stdout});
	const exitPromise = waitUntilExit();

	stdout.end();
	unmount();
	await exitPromise;
	await delay(0);

	t.assert.strictEqual(
		writeErrors.some(
			error =>
				(error as NodeJS.ErrnoException).code === 'ERR_STREAM_WRITE_AFTER_END',
		),
		false,
	);
});

test('unmount cancels pending throttled log writes when stdout is ended', (t: TestContext) => {
	const clock = FakeTimers.install({toNotFake: ['nextTick']});
	try {
		const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
		stdout.columns = 100;

		const writeErrors: Error[] = [];
		stdout.on('error', error => {
			writeErrors.push(error);
		});

		const {rerender, unmount} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1,
		});

		rerender(<ThrottleTestComponent text="World" />);
		stdout.end();
		unmount();
		clock.tick(1000);

		t.assert.strictEqual(
			writeErrors.some(
				error =>
					(error as NodeJS.ErrnoException).code ===
					'ERR_STREAM_WRITE_AFTER_END',
			),
			false,
		);
	} finally {
		clock.uninstall();
	}
});

test('unmount cancels pending throttled render when stdout is ended', (t: TestContext) => {
	const clock = FakeTimers.install({toNotFake: ['nextTick']});
	try {
		const baselineStdout = new PassThrough() as unknown as NodeJS.WriteStream;
		baselineStdout.columns = 100;

		const baselineApp = render(<ThrottleTestComponent text="Hello" />, {
			stdout: baselineStdout,
			maxFps: 1,
		});
		baselineStdout.end();
		baselineApp.unmount();
		const baselineTimers = clock.countTimers();
		clock.runAll();

		const stdout = new PassThrough() as unknown as NodeJS.WriteStream;
		stdout.columns = 100;

		const {rerender, unmount} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1,
		});
		rerender(<ThrottleTestComponent text="World" />);
		stdout.end();
		unmount();

		t.assert.strictEqual(clock.countTimers(), baselineTimers);
	} finally {
		clock.uninstall();
	}
});

const createTtyStdout = (columns?: number) => {
	const stdout = createStdout(columns);
	(stdout as any).isTTY = true;
	return stdout;
};

const withFakeClock = (
	run: (clock: ReturnType<typeof FakeTimers.install>) => void,
) => {
	const clock = FakeTimers.install({toNotFake: ['nextTick']});
	try {
		run(clock);
	} finally {
		clock.uninstall();
	}
};

const captureWrites = (stdout: NodeJS.WriteStream): string[] => {
	const writes: string[] = [];
	const originalWrite = stdout.write;
	(stdout as any).write = (...args: any[]) => {
		writes.push(args[0] as string);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return (originalWrite as any)(...args);
	};

	return writes;
};

const assertNoBsuEsuForUnchangedTrailingRerender = (
	t: TestContext,
	element: React.ReactElement,
) => {
	withFakeClock(clock => {
		const stdout = createTtyStdout();
		const writes = captureWrites(stdout);
		const {unmount, rerender} = render(element, {stdout, maxFps: 1});
		try {
			t.assert.ok(writes.includes(bsu), 'initial render should include bsu');

			writes.length = 0;
			rerender(element);
			clock.tick(1000);

			t.assert.strictEqual(
				writes.includes(bsu),
				false,
				'unchanged rerender should not emit bsu',
			);
			t.assert.strictEqual(
				writes.includes(esu),
				false,
				'unchanged rerender should not emit esu',
			);
		} finally {
			unmount();
		}
	});
};

// eslint-disable-next-line node-test/require-assertion -- The helper asserts.
test('no bsu/esu when output is unchanged', (t: TestContext) => {
	assertNoBsuEsuForUnchangedTrailingRerender(
		t,
		<ThrottleTestComponent text="Hello" />,
	);
});

// eslint-disable-next-line node-test/require-assertion -- The helper asserts.
test('no bsu/esu when output and cursor are unchanged', (t: TestContext) => {
	assertNoBsuEsuForUnchangedTrailingRerender(
		t,
		<ThrottleCursorTestComponent text="Hello" />,
	);
});

test('bsu/esu wraps throttledLog trailing call', (t: TestContext) => {
	withFakeClock(clock => {
		const stdout = createTtyStdout();
		const writes = captureWrites(stdout);
		const {unmount, rerender} = render(<ThrottleTestComponent text="Hello" />, {
			stdout,
			maxFps: 1,
		});
		try {
			// Leading call writes: bsu, content, esu
			const leadingWrites = new Set(writes);
			t.assert.ok(leadingWrites.has(bsu), 'leading call should include bsu');
			t.assert.ok(leadingWrites.has(esu), 'leading call should include esu');

			// Trigger a rerender inside the throttle window (will be deferred as trailing)
			writes.length = 0;
			rerender(<ThrottleTestComponent text="World" />);

			// No immediate write yet (throttled)
			const midWrites = [...writes];
			t.assert.strictEqual(
				midWrites.some(w => w.includes('World')),
				false,
				'trailing call should not write immediately',
			);

			// Advance past throttle window to trigger trailing call
			writes.length = 0;
			clock.tick(1000);

			// Trailing call should also be wrapped with bsu/esu
			t.assert.ok(writes.includes(bsu), 'trailing call should include bsu');
			t.assert.ok(writes.includes(esu), 'trailing call should include esu');

			// Verify bsu comes before content and esu comes after
			const bsuIdx = writes.indexOf(bsu);
			const esuIdx = writes.indexOf(esu);
			t.assert.ok(bsuIdx < esuIdx, 'bsu should come before esu');
		} finally {
			unmount();
		}
	});
});

test('unmount frees the root Yoga node', (t: TestContext) => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const instance = instances.get(stdout) as unknown as {rootNode: DOMElement};
	const free = spy(instance.rootNode.yogaNode!, 'free');

	unmount();

	t.assert.ok(free.calledOnce);
	t.assert.strictEqual(instance.rootNode.yogaNode, undefined);
});
