import test from 'ava';
import React from 'react';
import {Box, Text, render, getFrameController} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

// Background applied to selected cells (see output.ts). Built from the escape
// code so this test does not depend on a raw control character in the source.
const selectionHighlight = `${String.fromCodePoint(27)}[48;5;240m`;

// Frame notifications are deferred to a microtask, so tests await this to let
// every scheduled notification (and the renders it may trigger) settle.
const settle = async () => {
	await new Promise<void>(resolve => {
		setImmediate(resolve);
	});
};

const writeCount = (stdout: ReturnType<typeof createStdout>): number =>
	(stdout.write as any).callCount as number;

test('getFrameController returns undefined for an unknown stdout', t => {
	const stdout = createStdout();
	t.is(getFrameController(stdout), undefined);
});

test('getFrameController returns a controller after render', t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	t.truthy(getFrameController(stdout));

	unmount();
});

test('no frame is generated while there are no subscribers', t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	// Nothing subscribed during the render, so no cells were projected.
	t.is(getFrameController(stdout)!.getFrame(), undefined);

	unmount();
});

test('subscribe opts into frame generation and receives the current frame', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	const frames: number[] = [];
	const unsubscribe = controller.subscribe(frame => {
		frames.push(frame.height);
	});

	// Subscribing schedules a render so late subscribers still get a frame.
	await settle();

	t.deepEqual(frames, [1]);

	const frame = controller.getFrame();
	t.truthy(frame);
	t.is(frame!.height, 1);
	t.is(frame!.width, frame!.cells[0]!.length);

	unsubscribe();
	unmount();
});

test('listeners are notified outside of the render pass', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	let notifications = 0;

	controller.subscribe(() => {
		notifications++;
	});

	// The render triggered by subscribe() already ran synchronously (debug
	// mode), but the notification is deferred.
	t.is(notifications, 0);

	await settle();
	t.is(notifications, 1);

	unmount();
});

test('getFrame exposes the composited cells', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hi</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	const row = controller.getFrame()!.cells[0]!;
	t.is(row[0]!.value, 'H');
	t.false(row[0]!.fullWidth);
	t.is(row[1]!.value, 'i');

	unmount();
});

test('frames are published on subsequent renders', async t => {
	const stdout = createStdout();
	const instance = render(<Text>A</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	instance.rerender(<Text>BB</Text>);
	await settle();

	const row = controller.getFrame()!.cells[0]!;
	t.is(row[0]!.value, 'B');
	t.is(row[1]!.value, 'B');

	instance.unmount();
});

test('wide characters occupy two cells', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>你好</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	const row = controller.getFrame()!.cells[0]!;
	t.is(row[0]!.value, '你');
	t.true(row[0]!.fullWidth);
	// Trailing placeholder of a wide character.
	t.is(row[1]!.value, '');
	t.false(row[1]!.fullWidth);
	t.is(row[2]!.value, '好');
	t.true(row[2]!.fullWidth);
	t.is(row[3]!.value, '');

	// Text extraction skips placeholder cells; trailing cells pad the row to
	// the frame width with spaces.
	const extracted = row
		.map(cell => cell.value)
		.join('')
		.replace(/ +$/u, '');
	t.is(extracted, '你好');

	unmount();
});

test('setSelection highlights the selected cells', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	t.false(stdout.get().includes(selectionHighlight));

	controller.setSelection({sx: 0, sy: 0, ex: 4, ey: 0});

	t.true(stdout.get().includes(selectionHighlight));

	unmount();
});

test('clearing the selection removes the highlight', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	controller.setSelection({sx: 0, sy: 0, ex: 4, ey: 0});
	t.true(stdout.get().includes(selectionHighlight));

	controller.setSelection(undefined);
	t.false(stdout.get().includes(selectionHighlight));

	unmount();
});

test('selections spanning multiple rows highlight whole middle rows', async t => {
	const stdout = createStdout();
	const {unmount} = render(
		<Box flexDirection="column">
			<Text>aaaa</Text>
			<Text>bbbb</Text>
			<Text>cccc</Text>
		</Box>,
		{stdout, debug: true},
	);

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	controller.setSelection({sx: 2, sy: 0, ex: 1, ey: 2});
	await settle();

	const highlighted = stdout.get();
	const [first = '', middle = '', last = ''] = highlighted.split('\n');

	// First row is selected from column 2, last row up to column 1, and the
	// whole middle row is selected.
	t.true(first.includes(selectionHighlight + 'aa'));
	t.true(middle.startsWith(selectionHighlight));
	t.true(last.includes(selectionHighlight + 'cc'));
	t.false(last.includes(selectionHighlight + 'cccc'));

	unmount();
});

test('reverse selections are normalized to reading order', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	// Right-to-left drag over the same region.
	controller.setSelection({sx: 4, sy: 0, ex: 0, ey: 0});

	t.deepEqual(controller.getSelection(), {sx: 0, sy: 0, ex: 4, ey: 0});

	const reverseOutput = stdout.get();
	t.true(reverseOutput.includes(selectionHighlight));

	controller.setSelection(undefined);
	controller.setSelection({sx: 0, sy: 0, ex: 4, ey: 0});

	// The highlight is identical to a forward selection over the same region.
	t.is(stdout.get(), reverseOutput);

	unmount();
});

test('setting an identical selection does not trigger a repaint', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	controller.setSelection({sx: 0, sy: 0, ex: 4, ey: 0});
	const writesAfterFirst = writeCount(stdout);

	controller.setSelection({sx: 0, sy: 0, ex: 4, ey: 0});
	t.is(writeCount(stdout), writesAfterFirst);

	// The reverse spelling of the same region normalizes to it and is a no-op too.
	controller.setSelection({sx: 4, sy: 0, ex: 0, ey: 0});
	t.is(writeCount(stdout), writesAfterFirst);

	unmount();
});

test('a subscriber calling setSelection does not re-enter rendering', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	const frames: number[] = [];
	let reentered = false;

	controller.subscribe(frame => {
		frames.push(frame.height);

		// A listener that mutates the selection schedules a new render, which
		// publishes another frame. This must not throw or interleave frames.
		if (!reentered) {
			reentered = true;
			controller.setSelection({sx: 0, sy: 0, ex: 1, ey: 0});
		}
	});

	await settle();

	// One notification per published frame: the render scheduled by
	// subscribe() and the one triggered by setSelection(). The initial render
	// published nothing because there were no subscribers yet.
	t.is(frames.length, 2);
	t.true(reentered);
	t.true(stdout.get().includes(selectionHighlight));

	unmount();
});

test('getFrameController returns undefined after unmount', t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {stdout, debug: true});

	t.truthy(getFrameController(stdout));

	unmount();

	t.is(getFrameController(stdout), undefined);
});

test('selection highlight reaches the terminal in interactive (non-debug) mode', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text>Hello</Text>, {
		stdout,
		interactive: true,
	});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	controller.setSelection({sx: 0, sy: 0, ex: 4, ey: 0});

	// Renders are throttled (default maxFps), so give the repaint time to land.
	await new Promise<void>(resolve => {
		setTimeout(resolve, 150);
	});

	// Interactive renders write bsu/content/esu as separate writes, so look at
	// the last render's writes rather than only the final one.
	const lastRender = () => stdout.getWrites().slice(-3).join('');

	t.true(lastRender().includes(selectionHighlight));

	controller.setSelection(undefined);

	await new Promise<void>(resolve => {
		setTimeout(resolve, 150);
	});

	t.false(lastRender().includes(selectionHighlight));

	unmount();
});
