import {Readable} from 'node:stream';
import {setTimeout as delay} from 'node:timers/promises';
import test, {type TestContext} from 'node:test';
import FakeTimers from '@sinonjs/fake-timers';
import React, {useState} from 'react';
import {render, useApp, useInput} from '../src/index.js';
import {resolveFlags} from '../src/kitty-keyboard.js';
import createStdout from './helpers/create-stdout.js';
import {
	createStdin as createSyncStdin,
	emitReadable,
} from './helpers/create-stdin.js';
import {act} from './helpers/act.js';

const createStdin = () =>
	Object.assign(new Readable({read() {}}), {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		isTTY: true,
		setRawMode() {},
	});

const pushKeyboard = '\u{1B}[>1u';
const popKeyboard = '\u{1B}[<u';
const queryKeyboard = '\u{1B}[?u';
const enterAlternateScreen = '\u{1B}[?1049h';
const exitAlternateScreen = '\u{1B}[?1049l';
const trackedSequences = new Set([
	pushKeyboard,
	popKeyboard,
	queryKeyboard,
	enterAlternateScreen,
	exitAlternateScreen,
]);

// Records raw mode changes together with the keyboard protocol and alternate screen sequences, in the order they reach the terminal.
const createTerminal = () => {
	const events: string[] = [];
	const stdin = createSyncStdin();
	stdin.setRawMode = (isEnabled: boolean) => {
		events.push(isEnabled ? 'raw on' : 'raw off');
		return stdin;
	};

	const stdout = createStdout();
	const write = stdout.write.bind(stdout) as (
		...arguments_: unknown[]
	) => boolean;
	stdout.write = (...arguments_: unknown[]) => {
		const [data] = arguments_;
		if (typeof data === 'string' && trackedSequences.has(data)) {
			events.push(data);
		}

		return write(...arguments_);
	};

	return {stdin, stdout, events};
};

function ToggledInput({isActive = true}: {readonly isActive?: boolean}) {
	useInput(() => {}, {isActive});
	return null;
}

test('associated text requests include all-key reporting', (t: TestContext) => {
	t.assert.strictEqual(resolveFlags(['reportAssociatedText']), 24);
	t.assert.strictEqual(
		resolveFlags(['disambiguateEscapeCodes', 'reportAssociatedText']),
		25,
	);
});

test('auto detection consumes responses without duplicating input', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	const inputs: string[] = [];
	function Example() {
		useInput(input => {
			inputs.push(input);
		});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
	});
	stdin.push('x\u{1B}[?0u');
	await delay(30);
	t.assert.deepStrictEqual(inputs, ['x']);
	t.assert.ok(stdout.getWrites().includes('\u{1B}[>1u'));
});

test('suspension cancels pending keyboard negotiation', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	let suspendTerminal!: ReturnType<typeof useApp>['suspendTerminal'];
	function Example() {
		suspendTerminal = useApp().suspendTerminal;
		useInput(() => {});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		alternateScreen: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
	});
	const suspension = await suspendTerminal();
	const beforeResponse = stdout.getWrites().length;
	stdin.push('\u{1B}[?0u');
	await delay(30);
	t.assert.deepStrictEqual(stdout.getWrites().slice(beforeResponse), []);
	await suspension.resume();
	t.assert.strictEqual(stdout.getWrites().includes('\u{1B}[>1u'), false);
});

test('unmount while suspended does not pop the primary keyboard stack', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	let suspendTerminal!: ReturnType<typeof useApp>['suspendTerminal'];
	function Example() {
		suspendTerminal = useApp().suspendTerminal;
		useInput(() => {});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		alternateScreen: true,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.after(() => {
		app.unmount();
	});
	const suspension = await suspendTerminal();
	app.unmount();
	await suspension.resume();
	t.assert.strictEqual(
		stdout.getWrites().filter(value => value === '\u{1B}[>1u').length,
		1,
	);
	t.assert.strictEqual(
		stdout.getWrites().filter(value => value === '\u{1B}[<u').length,
		1,
	);
});

test('pasted query responses remain input and do not enable the protocol', async (t: TestContext) => {
	const stdin = createStdin();
	const stdout = createStdout();
	const inputs: string[] = [];
	function Example() {
		useInput(input => {
			inputs.push(input);
		});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
	});
	stdin.push('\u{1B}[200~\u{1B}[?0u\u{1B}[201~');
	await delay(30);
	t.assert.deepStrictEqual(inputs, ['[?0u']);
	t.assert.strictEqual(stdout.getWrites().includes('\u{1B}[>1u'), false);
});

test('auto detection queries the terminal only once raw mode is enabled', async (t: TestContext) => {
	const clock = FakeTimers.install({toFake: ['setTimeout', 'clearTimeout']});
	const stdout = createStdout();
	const rawModeEnabled = Promise.withResolvers<number>();
	const stdin = createSyncStdin();
	stdin.setRawMode = (isEnabled: boolean) => {
		if (isEnabled) {
			rawModeEnabled.resolve(stdout.getWrites().length);
		}

		return stdin;
	};

	let showInput!: () => void;
	function Input() {
		useInput(() => {});
		return null;
	}

	function Example() {
		const [isInputShown, setIsInputShown] = useState(false);
		showInput = () => {
			setIsInputShown(true);
		};

		return isInputShown ? <ToggledInput /> : null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
		clock.uninstall();
	});
	// Longer than the detection timeout: neither the query nor its timer may start before raw mode.
	await clock.tickAsync(250);
	t.assert.strictEqual(stdout.getWrites().includes('\u{1B}[?u'), false);
	showInput();
	const writesBeforeRawMode = await rawModeEnabled.promise;
	t.assert.ok(stdout.getWrites().indexOf('\u{1B}[?u') >= writesBeforeRawMode);
	emitReadable(stdin, '\u{1B}[?0u');
	t.assert.ok(stdout.getWrites().includes('\u{1B}[>1u'));
});

test('keyboard protocol is popped before raw mode goes off and pushed again once it is back on', async (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	const app = render(<ToggledInput />, {
		stdin,
		stdout,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.after(() => {
		app.unmount();
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', pushKeyboard]);

	await act(async () => {
		app.rerender(<ToggledInput isActive={false} />);
	});
	t.assert.deepStrictEqual(events.splice(0), [popKeyboard, 'raw off']);

	await act(async () => {
		app.rerender(<ToggledInput />);
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', pushKeyboard]);

	app.unmount();
	t.assert.deepStrictEqual(events, [popKeyboard, 'raw off']);
});

test('`enabled` mode never writes keyboard protocol sequences without an input hook', (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	const app = render(<ToggledInput isActive={false} />, {
		stdin,
		stdout,
		kittyKeyboard: {mode: 'enabled'},
	});
	app.unmount();
	t.assert.deepStrictEqual(events, []);
});

test('`enabled` mode pushes the keyboard protocol once an input hook enables raw mode', async (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	const app = render(<ToggledInput isActive={false} />, {
		stdin,
		stdout,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.after(() => {
		app.unmount();
	});
	t.assert.deepStrictEqual(events, []);

	await act(async () => {
		app.rerender(<ToggledInput />);
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', pushKeyboard]);

	await act(async () => {
		app.rerender(<ToggledInput isActive={false} />);
	});
	t.assert.deepStrictEqual(events.splice(0), [popKeyboard, 'raw off']);

	// The protocol is already popped, so unmount must not pop the stack again.
	app.unmount();
	t.assert.deepStrictEqual(events, []);
});

test('swapping input hooks in one commit does not pop and push the keyboard protocol', async (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	function First() {
		useInput(() => {});
		return null;
	}

	function Second() {
		useInput(() => {});
		return null;
	}

	function Example({isFirst}: {readonly isFirst: boolean}) {
		return isFirst ? <First /> : <Second />;
	}

	const app = render(<Example isFirst />, {
		stdin,
		stdout,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.after(() => {
		app.unmount();
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', pushKeyboard]);

	await act(async () => {
		app.rerender(<Example isFirst={false} />);
	});
	t.assert.deepStrictEqual(events, []);
});

test('Ctrl+C sent through the keyboard protocol pops it once before raw mode goes off', async (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	const app = render(<ToggledInput />, {
		stdin,
		stdout,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', pushKeyboard]);

	emitReadable(stdin, '\u{1B}[99;5u');
	await app.waitUntilExit();
	t.assert.deepStrictEqual(events, [popKeyboard, 'raw off']);
});

test('resuming pushes the keyboard protocol after the alternate screen and raw mode are back', async (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	let suspendTerminal!: ReturnType<typeof useApp>['suspendTerminal'];
	function Example() {
		suspendTerminal = useApp().suspendTerminal;
		useInput(() => {});
		return null;
	}

	const app = render(<Example />, {
		stdin,
		stdout,
		interactive: true,
		alternateScreen: true,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.after(() => {
		app.unmount();
	});
	t.assert.deepStrictEqual(events.splice(0), [
		enterAlternateScreen,
		'raw on',
		pushKeyboard,
	]);

	const suspension = await suspendTerminal();
	t.assert.deepStrictEqual(events.splice(0), [
		popKeyboard,
		exitAlternateScreen,
		'raw off',
	]);

	await suspension.resume();
	t.assert.deepStrictEqual(events.splice(0), [
		enterAlternateScreen,
		'raw on',
		pushKeyboard,
	]);

	app.unmount();
	t.assert.deepStrictEqual(events, [
		popKeyboard,
		'raw off',
		exitAlternateScreen,
	]);
});

test('resuming without an active input hook leaves the keyboard protocol popped until raw mode is enabled', async (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	let suspendTerminal!: ReturnType<typeof useApp>['suspendTerminal'];
	function Example({isActive}: {readonly isActive: boolean}) {
		suspendTerminal = useApp().suspendTerminal;
		useInput(() => {}, {isActive});
		return null;
	}

	const app = render(<Example isActive />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'enabled'},
	});
	t.after(() => {
		app.unmount();
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', pushKeyboard]);

	const suspension = await suspendTerminal();
	t.assert.deepStrictEqual(events.splice(0), [popKeyboard, 'raw off']);

	await act(async () => {
		app.rerender(<Example isActive={false} />);
	});
	await suspension.resume();
	t.assert.deepStrictEqual(events, []);

	await act(async () => {
		app.rerender(<Example isActive />);
	});
	t.assert.deepStrictEqual(events, ['raw on', pushKeyboard]);
});

test('auto detection is not repeated when raw mode comes back on after a response', async (t: TestContext) => {
	const {stdin, stdout, events} = createTerminal();
	const app = render(<ToggledInput />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', queryKeyboard]);

	emitReadable(stdin, '\u{1B}[?0u');
	t.assert.deepStrictEqual(events.splice(0), [pushKeyboard]);

	await act(async () => {
		app.rerender(<ToggledInput isActive={false} />);
	});
	t.assert.deepStrictEqual(events.splice(0), [popKeyboard, 'raw off']);

	await act(async () => {
		app.rerender(<ToggledInput />);
	});
	t.assert.deepStrictEqual(events, ['raw on', pushKeyboard]);
});

test('auto detection is not repeated when raw mode comes back on after a timeout', async (t: TestContext) => {
	const clock = FakeTimers.install({toFake: ['setTimeout', 'clearTimeout']});
	const {stdin, stdout, events} = createTerminal();
	const app = render(<ToggledInput />, {
		stdin,
		stdout,
		interactive: true,
		kittyKeyboard: {mode: 'auto'},
	});
	t.after(() => {
		app.unmount();
		clock.uninstall();
	});
	t.assert.deepStrictEqual(events.splice(0), ['raw on', queryKeyboard]);

	// Raw mode goes off while the query is still unanswered, and the detection then times out.
	await act(async () => {
		app.rerender(<ToggledInput isActive={false} />);
	});
	await clock.tickAsync(250);
	t.assert.deepStrictEqual(events.splice(0), ['raw off']);

	await act(async () => {
		app.rerender(<ToggledInput />);
	});
	t.assert.deepStrictEqual(events, ['raw on']);
});
