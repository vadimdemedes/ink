import test from 'ava';
import React from 'react';
import {
	Box,
	Text,
	render,
	getFrameController,
	type ReadonlyFrame,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

// Background applied to selected cells (see output.ts). Built from the escape
// code so this test does not depend on a raw control character in the source.
const selectionHighlight = `${String.fromCodePoint(27)}[48;5;240m`;

const settle = async () => {
	await new Promise<void>(resolve => {
		setImmediate(resolve);
	});
};

// Renders `element`, subscribes so cells are captured, and returns the frame.
const captureFrame = async (
	element: React.ReactElement,
): Promise<{
	frame: ReadonlyFrame;
	stdout: ReturnType<typeof createStdout>;
	unmount: () => void;
}> => {
	const stdout = createStdout();
	const {unmount} = render(element, {stdout, debug: true});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	return {frame: controller.getFrame()!, stdout, unmount};
};

test('selectable={false} on a nested Text node is preserved through squashing', async t => {
	const {frame, unmount} = await captureFrame(
		<Text>
			AB
			<Text selectable={false}>CD</Text>
			EF
		</Text>,
	);

	const row = frame.cells[0]!;
	t.is(
		row
			.map(cell => cell.value)
			.join('')
			.trimEnd(),
		'ABCDEF',
	);

	t.true(row[0]!.selectable);
	t.true(row[1]!.selectable);
	t.false(row[2]!.selectable);
	t.false(row[3]!.selectable);
	t.true(row[4]!.selectable);
	t.true(row[5]!.selectable);

	unmount();
});

test('explicit selectable={true} on a nested Text re-enables selection', async t => {
	const {frame, unmount} = await captureFrame(
		<Text selectable={false}>
			AB<Text selectable>CD</Text>EF
		</Text>,
	);

	const row = frame.cells[0]!;
	t.false(row[0]!.selectable);
	t.false(row[1]!.selectable);
	t.true(row[2]!.selectable);
	t.true(row[3]!.selectable);
	t.false(row[4]!.selectable);
	t.false(row[5]!.selectable);

	unmount();
});

test('nested selectable metadata survives color transforms', async t => {
	const {frame, unmount} = await captureFrame(
		<Text color="red">
			A<Text selectable={false}>B</Text>C
		</Text>,
	);

	const row = frame.cells[0]!;
	t.is(
		row
			.map(cell => cell.value)
			.join('')
			.trimEnd(),
		'ABC',
	);
	t.true(row[0]!.selectable);
	t.false(row[1]!.selectable);
	t.true(row[2]!.selectable);

	unmount();
});

test('selection skips non-selectable cells when highlighting', async t => {
	const stdout = createStdout();
	const {unmount} = render(
		<Text>
			AB
			<Text selectable={false}>CD</Text>
			EF
		</Text>,
		{stdout, debug: true},
	);

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	controller.setSelection({sx: 0, sy: 0, ex: 5, ey: 0});

	const output = stdout.get();
	t.true(
		output.includes(selectionHighlight + 'AB'),
		'selectable prefix is highlighted',
	);
	t.true(
		output.includes(selectionHighlight + 'EF'),
		'selectable suffix is highlighted',
	);
	t.false(
		output.includes(selectionHighlight + 'C'),
		'non-selectable cells are skipped',
	);

	unmount();
});

test('non-selectable wide characters are skipped by the highlight', async t => {
	const stdout = createStdout();
	const {unmount} = render(<Text selectable={false}>你好</Text>, {
		stdout,
		debug: true,
	});

	const controller = getFrameController(stdout)!;
	controller.subscribe(() => {});
	await settle();

	controller.setSelection({sx: 0, sy: 0, ex: 3, ey: 0});

	t.false(stdout.get().includes(selectionHighlight));

	unmount();
});

test('box background cells are not selectable', async t => {
	const {frame, unmount} = await captureFrame(
		<Box backgroundColor="red" width={3} height={1} />,
	);

	const row = frame.cells[0]!;
	t.false(row[0]!.selectable);
	t.false(row[1]!.selectable);
	t.false(row[2]!.selectable);

	unmount();
});

test('text nodes sharing a selectionFlow share a flowId', async t => {
	const {frame, unmount} = await captureFrame(
		<Box>
			<Text selectionFlow="group">A</Text>
			<Text selectionFlow="group">B</Text>
		</Box>,
	);

	const row = frame.cells[0]!;
	const aCell = row.find(cell => cell.value === 'A')!;
	const bCell = row.find(cell => cell.value === 'B')!;

	t.is(typeof aCell.flowId, 'number');
	t.is(aCell.flowId, bCell.flowId);

	unmount();
});

test('text nodes without a shared selectionFlow get distinct flowIds', async t => {
	const {frame, unmount} = await captureFrame(
		<Box>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	const row = frame.cells[0]!;
	const aCell = row.find(cell => cell.value === 'A')!;
	const bCell = row.find(cell => cell.value === 'B')!;

	t.not(aCell.flowId, bCell.flowId);

	unmount();
});

test('a nested selectionFlow overrides the surrounding flow', async t => {
	const {frame, unmount} = await captureFrame(
		<Text selectionFlow="outer">
			A<Text selectionFlow="inner">B</Text>C
		</Text>,
	);

	const row = frame.cells[0]!;
	t.is(row[0]!.value, 'A');
	t.is(row[1]!.value, 'B');
	t.is(row[2]!.value, 'C');

	t.is(row[0]!.flowId, row[2]!.flowId);
	t.not(row[1]!.flowId, row[0]!.flowId);

	unmount();
});

test('selectionBreakAfter="hard" records a boundary after the text', async t => {
	const {frame, unmount} = await captureFrame(
		<Box>
			<Text selectionBreakAfter="hard">AB</Text>
		</Box>,
	);

	const boundary = frame.boundaries[0]![1];
	t.truthy(boundary);
	t.is(boundary!.kind, 'hard');
	t.is(boundary!.joiner, '\n');
	t.is(frame.boundaries[0]![0], undefined);

	unmount();
});

test('selectionBreakAfter="soft" uses the custom joiner', async t => {
	const {frame, unmount} = await captureFrame(
		<Box>
			<Text selectionBreakAfter="soft" selectionJoiner=" | ">
				AB
			</Text>
		</Box>,
	);

	const boundary = frame.boundaries[0]![1];
	t.truthy(boundary);
	t.is(boundary!.kind, 'soft');
	t.is(boundary!.joiner, ' | ');

	unmount();
});

test('explicit newlines produce hard boundaries', async t => {
	const {frame, unmount} = await captureFrame(<Text>{'aaa\nbbb'}</Text>);

	const boundary = frame.boundaries[0]![2];
	t.truthy(boundary);
	t.is(boundary!.kind, 'hard');
	t.is(boundary!.joiner, '\n');

	unmount();
});

test('wrapping produces soft boundaries with the consumed whitespace', async t => {
	const {frame, unmount} = await captureFrame(
		<Box width={5}>
			<Text>aaa bbb</Text>
		</Box>,
	);

	t.is(
		frame.cells[0]!.slice(0, 3)
			.map(cell => cell.value)
			.join(''),
		'aaa',
	);
	t.is(
		frame.cells[1]!.slice(0, 3)
			.map(cell => cell.value)
			.join(''),
		'bbb',
	);

	// With `trim: false` wrapping the space at the wrap point stays on the
	// first line, so the boundary sits after it with an empty joiner: copying
	// the cells up to the boundary and joining the next line reproduces the
	// original text.
	const boundary = frame.boundaries[0]![3];
	t.truthy(boundary);
	t.is(boundary!.kind, 'soft');
	t.is(boundary!.joiner, '');

	unmount();
});

test('wide characters carry semantics on leading and placeholder cells', async t => {
	const {frame, unmount} = await captureFrame(
		<Text selectable={false}>你好</Text>,
	);

	const row = frame.cells[0]!;
	t.is(row[0]!.value, '你');
	t.true(row[0]!.fullWidth);
	t.false(row[0]!.selectable);
	t.is(row[1]!.value, '');
	t.false(row[1]!.selectable);
	t.is(typeof row[0]!.flowId, 'number');
	t.is(row[1]!.flowId, row[0]!.flowId);

	unmount();
});
