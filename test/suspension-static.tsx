import test, {type TestContext} from 'node:test';
import React, {memo, useEffect, useLayoutEffect} from 'react';
import stripAnsi from 'strip-ansi';
import {
	render,
	useApp,
	Static,
	Text,
	type RenderOptions,
} from '../src/index.js';
import {
	type SuspendTerminal,
	type TerminalSuspension,
} from '../src/components/AppContext.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';
import term from './helpers/term.js';
import {reconstructTerminalLines} from './helpers/reconstruct-terminal.js';

const enterAltScreen = '\u{1B}[?1049h';

const one = ['one'];
const two = ['one', 'two'];
const three = ['one', 'two', 'three'];

// Memoized so that a rerender with the same items only changes the live frame. Rerendering <Static> itself always renders immediately instead of going through the throttle.
const Items = memo(({items}: {readonly items: string[]}) => (
	<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
));

type Props = {
	readonly items: string[];
	// Defaults to the number of items.
	readonly footer?: string;
	readonly staticKey?: string;
	readonly onEffect?: () => void;
};

// Renders `one` in <Static> above a live footer, like the app in #1082.
const renderItems = async (options: RenderOptions = {}, rows?: number) => {
	const stdout = createStdout();
	if (rows !== undefined) {
		stdout.rows = rows;
	}

	let suspendTerminal!: SuspendTerminal;
	let exit!: () => void;

	function Example({items, footer, staticKey, onEffect}: Props) {
		const app = useApp();

		useLayoutEffect(() => {
			suspendTerminal = app.suspendTerminal;
			exit = app.exit;
		}, [app.suspendTerminal, app.exit]);

		useEffect(() => {
			onEffect?.();
		});

		return (
			<>
				<Items key={staticKey} items={items} />
				<Text>{footer ?? `${items.length} items`}</Text>
			</>
		);
	}

	const instance = render(<Example items={one} />, {
		stdout,
		stdin: createStdin(),
		interactive: true,
		patchConsole: false,
		...options,
	});
	await instance.waitUntilRenderFlush();

	return {
		stdout,
		instance,
		suspend: async () => suspendTerminal(),
		exit() {
			exit();
		},
		rerender(props: Props) {
			instance.rerender(<Example {...props} />);
		},
		async update(props: Props) {
			instance.rerender(<Example {...props} />);
			await instance.waitUntilRenderFlush();
		},
		// Every write since `start` except the empty ones that `waitUntilRenderFlush()` waits on.
		writtenWhileSuspended: (start: number) =>
			stdout.getWrites().slice(start).filter(Boolean),
		// Writes since `start` that carry text, without the control sequences and flush barriers around them.
		textWritesSince: (start: number) =>
			stdout
				.getWrites()
				.slice(start)
				.filter(write => stripAnsi(write) !== ''),
	};
};

for (const {mode, options, resumed, later} of [
	{
		mode: 'standard',
		options: {},
		resumed: ['two\n', '2 items\n'],
		later: ['three\n', '3 items\n'],
	},
	{
		mode: 'incremental',
		options: {incrementalRendering: true},
		resumed: ['two\n', '2 items\n'],
		later: ['three\n', '3 items\n'],
	},
	{
		mode: 'screen reader',
		options: {isScreenReaderEnabled: true},
		resumed: ['two\n', '2 items\n'],
		later: ['three\n', '3 items\n'],
	},
	{
		mode: 'concurrent',
		options: {concurrent: true},
		resumed: ['two\n', '2 items\n'],
		later: ['three\n', '3 items\n'],
	},
	{
		// Debug mode writes all static output followed by the frame on every render.
		mode: 'debug',
		options: {debug: true},
		resumed: ['one\ntwo\n2 items'],
		later: ['one\ntwo\nthree\n3 items', 'one\ntwo\nthree\n3 items'],
	},
	{
		mode: 'debug on the alternate screen',
		options: {debug: true, alternateScreen: true},
		resumed: ['one\ntwo\n2 items'],
		later: ['one\ntwo\nthree\n3 items', 'one\ntwo\nthree\n3 items'],
	},
]) {
	test(`<Static> item added while suspended is written once on resume - ${mode}`, async (t: TestContext) => {
		const {
			stdout,
			instance,
			suspend,
			update,
			writtenWhileSuspended,
			textWritesSince,
		} = await renderItems(options);
		t.after(() => {
			instance.unmount();
		});

		const suspension = await suspend();
		const suspendedAt = stdout.getWrites().length;
		await update({items: two});
		t.assert.deepStrictEqual(writtenWhileSuspended(suspendedAt), []);

		const resumedAt = stdout.getWrites().length;
		await suspension.resume();
		t.assert.deepStrictEqual(textWritesSince(resumedAt), resumed);

		const laterAt = stdout.getWrites().length;
		await update({items: three});
		t.assert.deepStrictEqual(textWritesSince(laterAt), later);
	});
}

test('<Static> items added in separate commits while suspended are written once, in order', async (t: TestContext) => {
	const {
		stdout,
		instance,
		suspend,
		update,
		writtenWhileSuspended,
		textWritesSince,
	} = await renderItems();
	t.after(() => {
		instance.unmount();
	});

	const suspension = await suspend();
	const suspendedAt = stdout.getWrites().length;
	await update({items: two});
	// A commit that only changes the live frame collects nothing and still flushes.
	await update({items: two, footer: 'working'});
	await update({items: three});
	t.assert.deepStrictEqual(writtenWhileSuspended(suspendedAt), []);

	const resumedAt = stdout.getWrites().length;
	await suspension.resume();
	t.assert.deepStrictEqual(textWritesSince(resumedAt), [
		'two\nthree\n',
		'3 items\n',
	]);
});

test('<Static> item added while suspended is written once when a throttled render was pending at the handoff', async (t: TestContext) => {
	const {
		stdout,
		instance,
		suspend,
		rerender,
		update,
		writtenWhileSuspended,
		textWritesSince,
	} = await renderItems({maxFps: 1});
	t.after(() => {
		instance.unmount();
	});

	// The first frame that only changes the live output takes the leading edge of the throttle, so the second one is left waiting on the trailing edge.
	rerender({items: one, footer: 'leading'});
	rerender({items: one, footer: 'pending'});
	const suspension = await suspend();
	const suspendedAt = stdout.getWrites().length;
	await update({items: two});
	t.assert.deepStrictEqual(writtenWhileSuspended(suspendedAt), []);

	await suspension.resume();
	t.assert.deepStrictEqual(textWritesSince(suspendedAt), [
		'two\n',
		'2 items\n',
	]);
});

for (const isConcurrent of [false, true]) {
	test(`<Static> item is written once when an effect of the commit that added it resumes (concurrent: ${isConcurrent})`, async (t: TestContext) => {
		const {stdout, instance, suspend, update, textWritesSince} =
			await renderItems({concurrent: isConcurrent});
		t.after(() => {
			instance.unmount();
		});

		const suspension = await suspend();
		const suspendedAt = stdout.getWrites().length;
		let resumed: Promise<void> | undefined;
		// The effect runs before <Static> has dropped the item, so the redraw on resume still finds it in the tree.
		await update({
			items: two,
			onEffect() {
				resumed ??= suspension.resume();
			},
		});
		await resumed;

		t.assert.deepStrictEqual(textWritesSince(suspendedAt), [
			'two\n',
			'2 items\n',
		]);
	});
}

test('<Static> item is not written again when an effect of the commit that added it suspends', async (t: TestContext) => {
	const {stdout, instance, suspend, rerender, update, textWritesSince} =
		await renderItems({maxFps: 1});
	t.after(() => {
		instance.unmount();
	});

	// The first frame that only changes the live output takes the leading edge of the throttle. The second one waits on the trailing edge, and the handoff flushes it while the item is still in the tree.
	rerender({items: one, footer: 'leading'});
	rerender({items: one, footer: 'pending'});
	const startedAt = stdout.getWrites().length;
	let suspending: Promise<TerminalSuspension> | undefined;
	await update({
		items: two,
		onEffect() {
			suspending ??= suspend();
		},
	});
	const suspension = await suspending!;
	t.assert.deepStrictEqual(textWritesSince(startedAt), ['two\n', '2 items\n']);

	const resumedAt = stdout.getWrites().length;
	await suspension.resume();
	t.assert.deepStrictEqual(textWritesSince(resumedAt), ['2 items\n']);
});

for (const {mode, options} of [
	{mode: 'standard', options: {}},
	{mode: 'incremental', options: {incrementalRendering: true}},
	{mode: 'screen reader', options: {isScreenReaderEnabled: true}},
]) {
	test(`<Static> item added while suspended shows once on the alternate screen and is replayed with the rest - ${mode}`, async (t: TestContext) => {
		const rows = 4;
		const {stdout, instance, suspend, update} = await renderItems(
			{alternateScreen: true, ...options},
			rows,
		);
		t.after(() => {
			instance.unmount();
		});

		const suspension = await suspend();
		await update({items: two});
		await suspension.resume();

		// Re-entering the alternate screen starts from an empty buffer, so reconstruct only what was written from that point on.
		const linesSinceResume = () => {
			const output = stdout.getWrites().join('');
			return reconstructTerminalLines(
				output
					.slice(output.lastIndexOf(enterAltScreen) + enterAltScreen.length)
					.replaceAll('\n', '\r\n'),
				rows,
			);
		};

		t.assert.deepStrictEqual(linesSinceResume(), ['one', 'two', '2 items', '']);

		// A frame taller than the viewport takes the full-clear path, which replays the accumulated static output.
		await update({items: two, footer: 'a\nb\nc\nd\ne'});
		t.assert.deepStrictEqual(linesSinceResume(), [
			'one',
			'two',
			'a',
			'b',
			'c',
			'd',
			'e',
		]);
	});
}

for (const {name, options, rows, footer, resumed} of [
	{
		name: 'a frame taller than the viewport',
		options: {},
		rows: 2,
		footer: 'a\nb\nc',
		resumed: ['two\n', 'a\nb\nc'],
	},
	{
		name: 'a frame taller than the viewport (screen reader)',
		options: {isScreenReaderEnabled: true},
		rows: 2,
		footer: 'a\nb\nc',
		resumed: ['two\n', 'a\nb\nc'],
	},
	{
		name: 'no live output',
		options: {},
		rows: undefined,
		footer: '',
		resumed: ['two\n', '\n'],
	},
]) {
	test(`<Static> item added while suspended is written once when the first frame after resume is ${name}`, async (t: TestContext) => {
		const {stdout, instance, suspend, update, textWritesSince} =
			await renderItems(options, rows);
		t.after(() => {
			instance.unmount();
		});

		await update({items: one, footer});
		const suspension = await suspend();
		const suspendedAt = stdout.getWrites().length;
		await update({items: two, footer});
		await suspension.resume();

		t.assert.deepStrictEqual(textWritesSince(suspendedAt), resumed);
	});
}

test('<Static> item added while suspended is written once after clear() during the suspension', async (t: TestContext) => {
	const {stdout, instance, suspend, update, textWritesSince} =
		await renderItems();
	t.after(() => {
		instance.unmount();
	});

	const suspension = await suspend();
	const suspendedAt = stdout.getWrites().length;
	await update({items: two});
	instance.clear();
	await suspension.resume();

	t.assert.deepStrictEqual(textWritesSince(suspendedAt), [
		'two\n',
		'2 items\n',
	]);
});

test('<Static> item added while suspended is written once when stdout is not writable on resume', async (t: TestContext) => {
	const {stdout, instance, suspend, update, textWritesSince} =
		await renderItems();
	t.after(() => {
		instance.unmount();
	});

	const suspension = await suspend();
	const suspendedAt = stdout.getWrites().length;
	await update({items: two});
	(stdout as NodeJS.WriteStream & {writable?: boolean}).writable = false;
	await suspension.resume();

	// The redraw on resume is best-effort and still hands its output to the stream.
	t.assert.deepStrictEqual(textWritesSince(suspendedAt), [
		'two\n',
		'2 items\n',
	]);
});

for (const exitMethod of ['unmount', 'exit'] as const) {
	test(`${exitMethod}() while suspended drops the <Static> items added during the suspension`, async (t: TestContext) => {
		const {stdout, instance, suspend, exit, update} = await renderItems();

		const suspension = await suspend();
		await update({items: two});
		const writesBeforeExit = stdout.getWrites().length;

		if (exitMethod === 'exit') {
			exit();
		} else {
			instance.unmount();
		}

		await instance.waitUntilExit();
		await suspension.resume();

		// The terminal still belongs to the child process, so only the empty write that `waitUntilExit()` waits on remains.
		t.assert.deepStrictEqual(stdout.getWrites().slice(writesBeforeExit), ['']);
	});
}

test('<Static> items of an instance replaced while suspended are still written on the primary screen', async (t: TestContext) => {
	const {stdout, instance, suspend, update, textWritesSince} =
		await renderItems();
	t.after(() => {
		instance.unmount();
	});

	const suspension = await suspend();
	const suspendedAt = stdout.getWrites().length;
	await update({items: two});
	await update({items: ['new'], staticKey: 'replaced'});
	await suspension.resume();

	t.assert.deepStrictEqual(textWritesSince(suspendedAt), [
		'two\nnew\n',
		'1 items\n',
	]);
});

for (const {mode, options, resumed} of [
	{mode: 'in debug mode', options: {debug: true}, resumed: ['new\n1 items']},
	{
		mode: 'on the alternate screen',
		options: {alternateScreen: true},
		resumed: ['new\n', '1 items\n'],
	},
]) {
	test(`<Static> items of an instance replaced while suspended are not replayed ${mode}`, async (t: TestContext) => {
		const {stdout, instance, suspend, update, textWritesSince} =
			await renderItems(options);
		t.after(() => {
			instance.unmount();
		});

		const suspension = await suspend();
		const suspendedAt = stdout.getWrites().length;
		await update({items: two});
		await update({items: ['new'], staticKey: 'replaced'});
		await suspension.resume();

		t.assert.deepStrictEqual(textWritesSince(suspendedAt), resumed);
	});
}

test('non-interactive suspension writes <Static> items as they are added', async (t: TestContext) => {
	const {stdout, instance, suspend, update, textWritesSince} =
		await renderItems({interactive: false});
	t.after(() => {
		instance.unmount();
	});

	const suspension = await suspend();
	const suspendedAt = stdout.getWrites().length;
	await update({items: two});
	t.assert.deepStrictEqual(textWritesSince(suspendedAt), ['two\n']);

	await suspension.resume();
	t.assert.deepStrictEqual(textWritesSince(suspendedAt), ['two\n']);
});

test('<Static> item added while suspended is written once on resume (PTY)', async (t: TestContext) => {
	const ps = term('suspend-terminal-static');
	await ps.waitForExit();

	// Erased frames are gone from the reconstructed screen, so what is left is every static item once, in order, above the final frame.
	t.assert.deepStrictEqual(
		reconstructTerminalLines(ps.output, 24).filter(line => line !== ''),
		['one', 'two', 'three', '3 items'],
	);
});
