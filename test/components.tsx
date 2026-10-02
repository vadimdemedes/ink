import EventEmitter from 'node:events';
import process from 'node:process';
import test, {type TestContext} from 'node:test';
import FakeTimers from '@sinonjs/fake-timers';
import delay from 'delay';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import React, {Component, useEffect, useState} from 'react';
import {spy, stub} from 'sinon';
import ansiEscapes from 'ansi-escapes';
import {
	Box,
	Newline,
	render,
	Spacer,
	Static,
	Text,
	Transform,
	useApp,
	useInput,
	useStdin,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {emitReadable} from './helpers/create-stdin.js';
import {
	renderToString,
	renderToStringAsync,
} from './helpers/render-to-string.js';
import {run} from './helpers/run.js';
import {renderAsync} from './helpers/test-renderer.js';
import {act} from './helpers/act.js';

const createRawModeStdin = (): NodeJS.WriteStream => {
	const stdin = new EventEmitter() as NodeJS.WriteStream;
	stdin.setEncoding = () => {};
	stdin.setRawMode = spy();
	stdin.isTTY = true;
	stdin.ref = spy();
	stdin.unref = spy();
	stdin.read = stub();

	return stdin;
};

test('text', (t: TestContext) => {
	const output = renderToString(<Text>Hello World</Text>);

	t.assert.strictEqual(output, 'Hello World');
});

test('text with variable', (t: TestContext) => {
	const output = renderToString(<Text>Count: {1}</Text>);

	t.assert.strictEqual(output, 'Count: 1');
});

test('multiple text nodes', (t: TestContext) => {
	const output = renderToString(
		<Text>
			Hello
			{' World'}
		</Text>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('text with component', (t: TestContext) => {
	function World() {
		return <Text>World</Text>;
	}

	const output = renderToString(
		<Text>
			Hello <World />
		</Text>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('text with fragment', (t: TestContext) => {
	const output = renderToString(
		<Text>
			{/* eslint-disable-next-line @eslint-react/jsx-no-useless-fragment -- The fragment is what this test renders. */}
			Hello <>World</>{' '}
		</Text>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('wrap text', (t: TestContext) => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello\nWorld');
});

test('don’t wrap text if there is enough space', (t: TestContext) => {
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('hard wrap text', (t: TestContext) => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="hard">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello W\norld');
});

test('hard wrap with long word', (t: TestContext) => {
	const output = renderToString(
		<Box width={5}>
			<Text wrap="hard">aaaaaaaaaa</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'aaaaa\naaaaa');
});

test('don’t hard wrap text if there is enough space', (t: TestContext) => {
	const output = renderToString(
		<Box width={20}>
			<Text wrap="hard">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('truncate text in the end', (t: TestContext) => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello …');
});

test('truncate text in the middle', (t: TestContext) => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate-middle">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hel…rld');
});

test('truncate text in the beginning', (t: TestContext) => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate-start">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '… World');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('do not wrap text with BEL-terminated OSC hyperlinks', (t: TestContext) => {
	// "Click here" is 10 chars, box is 20 wide - should not wrap
	const hyperlink =
		'\u{1B}]8;;https://example.com\u{7}Click here\u{1B}]8;;\u{7}';
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output), 'Click here');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('do not wrap text with ST-terminated OSC hyperlinks', (t: TestContext) => {
	const hyperlink =
		'\u{1B}]8;;https://example.com\u{1B}\\Click here\u{1B}]8;;\u{1B}\\';
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output), 'Click here');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('do not wrap text with non-hyperlink OSC sequences', (t: TestContext) => {
	// Title-setting OSC followed by visible text
	const text = '\u{1B}]0;My Title\u{7}Some text';
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">{text}</Text>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output), 'Some text');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('hard-wrap single-word BEL-terminated OSC hyperlink', (t: TestContext) => {
	// "abcdefghij" is 10 chars, box is 5 wide - forces wrapWord codepath
	const hyperlink =
		'\u{1B}]8;;https://example.com\u{7}abcdefghij\u{1B}]8;;\u{7}';
	const output = renderToString(
		<Box width={5}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output), 'abcde\nfghij');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('hard-wrap single-word ST-terminated OSC hyperlink', (t: TestContext) => {
	const hyperlink =
		'\u{1B}]8;;https://example.com\u{1B}\\abcdefghij\u{1B}]8;;\u{1B}\\';
	const output = renderToString(
		<Box width={5}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.assert.strictEqual(stripAnsi(output), 'abcde\nfghij');
});

test('ignore empty text node', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box>
				<Text>Hello World</Text>
			</Box>
			{/* eslint-disable-next-line @stylistic/jsx-curly-brace-presence -- An empty string child creates the empty text node under test, while `<Text />` renders nothing. */}
			<Text>{''}</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('render a single empty text node', (t: TestContext) => {
	// eslint-disable-next-line @stylistic/jsx-curly-brace-presence -- An empty string child creates the empty text node under test, while `<Text />` renders nothing.
	const output = renderToString(<Text>{''}</Text>);
	t.assert.strictEqual(output, '');
});

test('number', (t: TestContext) => {
	const output = renderToString(<Text>{1}</Text>);

	t.assert.strictEqual(output, '1');
});

test('fail when text nodes are not within <Text> component', (t: TestContext) => {
	let error: Error | undefined;

	class ErrorBoundary extends Component<{children?: React.ReactNode}> {
		override render(): React.ReactNode {
			return this.props.children;
		}

		override componentDidCatch(reactError: Error): void {
			error = reactError;
		}
	}

	renderToString(
		<ErrorBoundary>
			<Box>
				Hello
				<Text>World</Text>
			</Box>
		</ErrorBoundary>,
	);

	t.assert.ok(error);
	t.assert.strictEqual(
		error?.message,
		'Text string "Hello" must be rendered inside <Text> component',
	);
});

test('fail when text node is not within <Text> component', (t: TestContext) => {
	let error: Error | undefined;

	class ErrorBoundary extends Component<{children?: React.ReactNode}> {
		override render(): React.ReactNode {
			return this.props.children;
		}

		override componentDidCatch(reactError: Error): void {
			error = reactError;
		}
	}

	renderToString(
		<ErrorBoundary>
			<Box>Hello World</Box>
		</ErrorBoundary>,
	);

	t.assert.ok(error);
	t.assert.strictEqual(
		error?.message,
		'Text string "Hello World" must be rendered inside <Text> component',
	);
});

test('fail when <Box> is inside <Text> component', (t: TestContext) => {
	let error: Error | undefined;

	class ErrorBoundary extends Component<{children?: React.ReactNode}> {
		override render(): React.ReactNode {
			return this.props.children;
		}

		override componentDidCatch(reactError: Error): void {
			error = reactError;
		}
	}

	renderToString(
		<ErrorBoundary>
			<Text>
				Hello World
				<Box />
			</Text>
		</ErrorBoundary>,
	);

	t.assert.ok(error);
	t.assert.strictEqual(
		(error as any).message,
		'<Box> can’t be nested inside <Text> component',
	);
});

test('remeasure text dimensions on text change', (t: TestContext) => {
	const stdout = createStdout();

	const {rerender} = render(
		<Box>
			<Text>Hello</Text>
		</Box>,
		{stdout, debug: true},
	);

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Hello');

	rerender(
		<Box>
			<Text>Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Hello World');
});

test('fragment', (t: TestContext) => {
	const output = renderToString(
		// eslint-disable-next-line @eslint-react/jsx-no-useless-fragment -- The fragment is what this test renders.
		<>
			<Text>Hello World</Text>
		</>,
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('transform children', (t: TestContext) => {
	const output = renderToString(
		<Transform
			transform={(string: string, index: number) => `[${index}: ${string}]`}
		>
			<Text>
				<Transform
					transform={(string: string, index: number) => `{${index}: ${string}}`}
				>
					<Text>test</Text>
				</Transform>
			</Text>
		</Transform>,
	);

	t.assert.strictEqual(output, '[0: {0: test}]');
});

test('squash multiple text nodes', (t: TestContext) => {
	const output = renderToString(
		<Transform
			transform={(string: string, index: number) => `[${index}: ${string}]`}
		>
			<Text>
				<Transform
					transform={(string: string, index: number) => `{${index}: ${string}}`}
				>
					{/* prettier-ignore */}
					<Text>hello{' '}world</Text>
				</Transform>
			</Text>
		</Transform>,
	);

	t.assert.strictEqual(output, '[0: {0: hello world}]');
});

test('transform with multiple lines', (t: TestContext) => {
	const output = renderToString(
		<Transform
			transform={(string: string, index: number) => `[${index}: ${string}]`}
		>
			{/* prettier-ignore */}
			<Text>hello{' '}world{'\n'}goodbye{' '}world</Text>
		</Transform>,
	);

	t.assert.strictEqual(output, '[0: hello world]\n[1: goodbye world]');
});

test('squash multiple nested text nodes', (t: TestContext) => {
	const output = renderToString(
		<Transform
			transform={(string: string, index: number) => `[${index}: ${string}]`}
		>
			<Text>
				<Transform
					transform={(string: string, index: number) => `{${index}: ${string}}`}
				>
					hello
					<Text> world</Text>
				</Transform>
			</Text>
		</Transform>,
	);

	t.assert.strictEqual(output, '[0: {0: hello world}]');
});

test('squash empty `<Text>` nodes', (t: TestContext) => {
	const output = renderToString(
		<Transform transform={(string: string) => `[${string}]`}>
			<Text>
				<Transform transform={(string: string) => `{${string}}`}>
					<Text>{[]}</Text>
				</Transform>
			</Text>
		</Transform>,
	);

	t.assert.strictEqual(output, '');
});

test('<Transform> with undefined children', (t: TestContext) => {
	const output = renderToString(<Transform transform={children => children} />);
	t.assert.strictEqual(output, '');
});

test('<Transform> with null children', (t: TestContext) => {
	const output = renderToString(<Transform transform={children => children} />);
	t.assert.strictEqual(output, '');
});

test('hooks', (t: TestContext) => {
	function WithHooks() {
		const [value, setValue] = useState('Hello');

		return <Text>{value}</Text>;
	}

	const output = renderToString(<WithHooks />);
	t.assert.strictEqual(output, 'Hello');
});

test('static output', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Static items={['A', 'B', 'C']} style={{paddingBottom: 1}}>
				{letter => <Text key={letter}>{letter}</Text>}
			</Static>

			<Box marginTop={1}>
				<Text>X</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nB\nC\n\n\nX');
});

test('static padding is not emitted again when there are no new items', (t: TestContext) => {
	const stdout = createStdout();
	const initialItems = ['A'];
	function Test({
		status,
		items = initialItems,
	}: {
		readonly status: string;
		readonly items?: string[];
	}) {
		return (
			<>
				<Static items={items} style={{padding: 1}}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Text>{status}</Text>
			</>
		);
	}

	const app = render(<Test status="Waiting" />, {stdout, debug: true});
	t.after(() => {
		app.unmount();
	});
	t.assert.strictEqual(stdout.get(), '\n A\n\nWaiting');
	app.rerender(<Test status="Ready" />);
	t.assert.strictEqual(stdout.get(), '\n A\n\nReady');
	app.rerender(<Test status="Done" items={['A', 'B']} />);
	t.assert.strictEqual(stdout.get(), '\n A\n\n\n B\n\nDone');
});

test('skip previous output when rendering new static output', (t: TestContext) => {
	const stdout = createStdout();

	function Dynamic({items}: {readonly items: string[]}) {
		return (
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
		);
	}

	const {rerender} = render(<Dynamic items={['A']} />, {
		stdout,
		debug: true,
	});

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'A\n');

	rerender(<Dynamic items={['A', 'B']} />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'A\nB\n');
});

test('static output stops accumulating after Static unmounts (#904)', (t: TestContext) => {
	const stdout = createStdout();
	const items = ['A', 'B'];

	function App({show}: {readonly show: boolean}) {
		return (
			<Box>
				{show ? (
					<Static items={items}>
						{item => <Text key={item}>{item}</Text>}
					</Static>
				) : null}
				<Text>Dynamic</Text>
			</Box>
		);
	}

	const {rerender} = render(<App show />, {
		stdout,
		debug: true,
	});

	// Unmount Static — this frees the Yoga WASM node via cleanupYogaNode.
	// The fix clears rootNode.staticNode so the renderer stops accessing it.
	rerender(<App show={false} />);
	const outputAfterUnmount = (stdout.write as any).lastCall.args[0] as string;

	// Do several more rerenders — these should NOT produce additional static output.
	// Without the fix, the stale staticNode reference causes the renderer to
	// re-render freed static content on every cycle, growing fullStaticOutput.
	for (let i = 0; i < 10; i++) {
		rerender(<App show={false} />);
	}

	const outputAfterChurn = (stdout.write as any).lastCall.args[0] as string;

	// In debug mode, each stdout.write is fullStaticOutput + dynamicOutput.
	// If staticNode is properly cleared, fullStaticOutput stops growing and
	// outputs stay the same length. If not, each render appends duplicate
	// static content, making outputs progressively longer.
	t.assert.strictEqual(outputAfterChurn.length, outputAfterUnmount.length);
	t.assert.ok(outputAfterChurn.includes('Dynamic'));
});

test('fullStaticOutput is reset when <Static> unmounts so stale items are not replayed', (t: TestContext) => {
	// Unmounting <Static> must clear `fullStaticOutput` so its items stop appearing in subsequent writes.
	const stdout = createStdout();

	function App({
		show,
		dynamicLabel,
	}: {
		readonly show: boolean;
		readonly dynamicLabel: string;
	}) {
		return (
			<Box>
				{show ? (
					<Static items={['HISTORY-A', 'HISTORY-B']}>
						{item => <Text key={item}>{item}</Text>}
					</Static>
				) : null}
				<Text>{dynamicLabel}</Text>
			</Box>
		);
	}

	const {rerender} = render(<App show dynamicLabel="d1" />, {
		stdout,
		debug: true,
	});

	const afterMount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterMount.includes('HISTORY-A'),
		'Static items must be emitted on first mount',
	);
	t.assert.ok(
		afterMount.includes('HISTORY-B'),
		'Static items must be emitted on first mount',
	);

	rerender(<App show={false} dynamicLabel="d2" />);

	const afterUnmount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.strictEqual(
		afterUnmount.includes('HISTORY-A'),
		false,
		'fullStaticOutput must NOT replay HISTORY-A after Static unmount',
	);
	t.assert.strictEqual(
		afterUnmount.includes('HISTORY-B'),
		false,
		'fullStaticOutput must NOT replay HISTORY-B after Static unmount',
	);
	t.assert.ok(
		afterUnmount.includes('d2'),
		'new dynamic output must still render',
	);
});

test('unmounting an ancestor of <Static> clears staticNode and does not crash the renderer', (t: TestContext) => {
	// When a component that *contains* <Static> is unmounted, the reconciler
	// removes the ancestor and freeRecursive() frees the static node's Yoga
	// WASM memory. If staticNode is not cleared, the next render calls
	// getComputedWidth() on freed memory → RuntimeError: memory access out
	// of bounds (QwenLM/qwen-code#6820).
	const stdout = createStdout();

	function Wrapper({children}: {readonly children: React.ReactNode}) {
		return <Box>{children}</Box>;
	}

	function App({
		showWrapper,
		label,
	}: {
		readonly showWrapper: boolean;
		readonly label: string;
	}) {
		return (
			<Box>
				{showWrapper ? (
					<Wrapper>
						<Static items={['HISTORY-X']}>
							{item => <Text key={item}>{item}</Text>}
						</Static>
					</Wrapper>
				) : null}
				<Text>{label}</Text>
			</Box>
		);
	}

	const {rerender} = render(<App showWrapper label="live-1" />, {
		stdout,
		debug: true,
	});

	const afterMount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(afterMount.includes('HISTORY-X'), 'Static item emitted on mount');

	// Unmount the Wrapper (ancestor of <Static>), not <Static> directly.
	// Before the fix this left a dangling staticNode pointing at freed WASM
	// memory, and the rerender below would crash.
	rerender(<App showWrapper={false} label="live-2" />);

	const afterUnmount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterUnmount.includes('live-2'),
		'dynamic content renders after unmount',
	);
	t.assert.strictEqual(
		afterUnmount.includes('HISTORY-X'),
		false,
		'stale static output must not replay',
	);

	// A second rerender confirms the renderer is still functional.
	rerender(<App showWrapper={false} label="live-3" />);
	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		'live-3',
		'renderer remains functional after indirect Static removal',
	);
});

test('removing a <Static> ancestor that is a direct child of the root does not crash', (t: TestContext) => {
	// Exercises the removeChildFromContainer path: the wrapper holding <Static>
	// is a direct child of the root container (via a top-level fragment), so its
	// removal fires removeChildFromContainer rather than removeChild.
	const stdout = createStdout();

	function App({
		showWrapper,
		label,
	}: {
		readonly showWrapper: boolean;
		readonly label: string;
	}) {
		return (
			<>
				{showWrapper ? (
					<Box>
						<Static items={['ROOT-HISTORY']}>
							{item => <Text key={item}>{item}</Text>}
						</Static>
					</Box>
				) : null}
				<Text>{label}</Text>
			</>
		);
	}

	const {rerender} = render(<App showWrapper label="root-1" />, {
		stdout,
		debug: true,
	});

	const afterMount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterMount.includes('ROOT-HISTORY'),
		'Static item emitted on mount',
	);

	rerender(<App showWrapper={false} label="root-2" />);

	const afterUnmount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterUnmount.includes('root-2'),
		'dynamic content renders after unmount',
	);
	t.assert.strictEqual(
		afterUnmount.includes('ROOT-HISTORY'),
		false,
		'stale static output must not replay',
	);
});

test('separate Ink instances do not clobber each other’s staticNode', (t: TestContext) => {
	// The owning root must be derived from the removal hook’s host parent, not a
	// module-level global. Rendering <Static> in the second instance moves the
	// global pointer to the second root; removing <Static>’s ancestor from the
	// first instance must still clear the FIRST root’s staticNode.
	const stdout1 = createStdout();
	const stdout2 = createStdout();

	function App({
		show,
		label,
	}: {
		readonly show: boolean;
		readonly label: string;
	}) {
		return (
			<Box>
				{show ? (
					<Box>
						<Static items={[`${label}-history`]}>
							{item => <Text key={item}>{item}</Text>}
						</Static>
					</Box>
				) : null}
				<Text>{label}</Text>
			</Box>
		);
	}

	const first = render(<App show label="first" />, {
		stdout: stdout1,
		debug: true,
	});

	// Rendering <Static> here points the module-global root at the second root.
	const second = render(<App show label="second" />, {
		stdout: stdout2,
		debug: true,
	});

	// Remove <Static>’s ancestor from the FIRST instance. With a global-based
	// lookup this consulted the second root and left the first root’s pointer
	// dangling, replaying stale static output.
	first.rerender(<App show={false} label="first-2" />);

	const firstOut = (stdout1.write as any).lastCall.args[0] as string;
	t.assert.ok(
		firstOut.includes('first-2'),
		'first instance renders new output',
	);
	t.assert.strictEqual(
		firstOut.includes('first-history'),
		false,
		'first instance must not replay stale static output',
	);

	// The second instance stays functional and independent.
	second.rerender(<App show={false} label="second-2" />);
	const secondOut = (stdout2.write as any).lastCall.args[0] as string;
	t.assert.ok(
		secondOut.includes('second-2'),
		'second instance renders new output',
	);

	first.unmount();
	second.unmount();
});

test('updating <Static> in one instance after another instance mounted <Static> sets the dirty flag on the correct root', (t: TestContext) => {
	// CommitUpdate must derive the owning root from the updated node, not a
	// module-level global. Rendering <Static> in the second instance used to
	// move the global pointer; appending to the first instance's <Static> then
	// set isStaticDirty on the second root, so the first root missed its
	// immediate render and the new item was lost.
	const stdout1 = createStdout();
	const stdout2 = createStdout();

	function App({
		items,
		label,
	}: {
		readonly items: string[];
		readonly label: string;
	}) {
		return (
			<Box>
				<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
				<Text>{label}</Text>
			</Box>
		);
	}

	const first = render(<App items={['A']} label="first" />, {
		stdout: stdout1,
		debug: true,
	});

	// Mounting <Static> in the second instance used to overwrite the global
	// root pointer.
	const second = render(<App items={['X']} label="second" />, {
		stdout: stdout2,
		debug: true,
	});

	// Append to the FIRST instance's <Static>. This triggers commitUpdate on
	// the first root's static node. The dirty flag must land on the first root
	// so the immediate render fires before useLayoutEffect clears the children.
	first.rerender(<App items={['A', 'B']} label="first" />);

	const firstOut = (stdout1.write as any).lastCall.args[0] as string;
	t.assert.ok(firstOut.includes('B'), 'appended static item must reach stdout');

	// The second instance stays functional and independent.
	second.rerender(<App items={['X', 'Y']} label="second" />);
	const secondOut = (stdout2.write as any).lastCall.args[0] as string;
	t.assert.ok(secondOut.includes('Y'), 'second instance static update works');

	first.unmount();
	second.unmount();
});

test('unmounting a <Static> ancestor in screen-reader mode does not replay stale output', (t: TestContext) => {
	// The screen-reader render path reads node.staticNode without a yogaNode
	// guard, so a dangling staticNode would replay the stale static subtree.
	const stdout = createStdout();

	function App({
		showWrapper,
		label,
	}: {
		readonly showWrapper: boolean;
		readonly label: string;
	}) {
		return (
			<Box>
				{showWrapper ? (
					<Box>
						<Static items={['SR-HISTORY']}>
							{item => <Text key={item}>{item}</Text>}
						</Static>
					</Box>
				) : null}
				<Text>{label}</Text>
			</Box>
		);
	}

	const {rerender} = render(<App showWrapper label="sr-1" />, {
		stdout,
		debug: true,
		isScreenReaderEnabled: true,
	});

	rerender(<App showWrapper={false} label="sr-2" />);

	const afterUnmount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterUnmount.includes('sr-2'),
		'dynamic content renders after unmount',
	);
	t.assert.strictEqual(
		afterUnmount.includes('SR-HISTORY'),
		false,
		'stale static output must not replay in screen-reader mode',
	);
});

test('unmounting a <Static> ancestor in concurrent mode does not crash', async (t: TestContext) => {
	const stdout = createStdout();

	function App({
		showWrapper,
		label,
	}: {
		readonly showWrapper: boolean;
		readonly label: string;
	}) {
		return (
			<Box>
				{showWrapper ? (
					<Box>
						<Static items={['CC-HISTORY']}>
							{item => <Text key={item}>{item}</Text>}
						</Static>
					</Box>
				) : null}
				<Text>{label}</Text>
			</Box>
		);
	}

	let instance!: ReturnType<typeof render>;

	await act(async () => {
		instance = render(<App showWrapper label="cc-1" />, {
			stdout,
			debug: true,
			concurrent: true,
		});
	});

	await delay(50);

	await act(async () => {
		instance.rerender(<App showWrapper={false} label="cc-2" />);
	});

	await delay(50);

	const afterUnmount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterUnmount.includes('cc-2'),
		'dynamic content renders after unmount',
	);
	t.assert.strictEqual(
		afterUnmount.includes('CC-HISTORY'),
		false,
		'stale static output must not replay',
	);

	instance.unmount();
});

test('remounting <Static> via key change emits the new items (nested under <Box>)', (t: TestContext) => {
	/*
	Exercises the `removeChild` path (Static nested in a <Box>). On key-driven remount, `createInstance` registers the new node before the old one is removed; the removal must not clobber the fresh pointer.
	*/
	const stdout = createStdout();

	function App({session}: {readonly session: number}) {
		const items = session === 1 ? ['old-A', 'old-B'] : ['new-C', 'new-D'];
		return (
			<Box>
				<Static key={session} items={items}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
				<Text>dynamic</Text>
			</Box>
		);
	}

	const {rerender} = render(<App session={1} />, {stdout, debug: true});

	const afterFirstMount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterFirstMount.includes('old-A'),
		'first mount must emit its Static items',
	);
	t.assert.ok(
		afterFirstMount.includes('old-B'),
		'first mount must emit its Static items',
	);

	rerender(<App session={2} />);

	const afterRemount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterRemount.includes('new-C'),
		'remounted Static must emit its first new item ("new-C") to stdout',
	);
	t.assert.ok(
		afterRemount.includes('new-D'),
		'remounted Static must emit its second new item ("new-D") to stdout',
	);
});

test('remounting <Static> via key change emits the new items (root-level — removeChildFromContainer)', (t: TestContext) => {
	// Same as the nested case above but exercises the `removeChildFromContainer` path (Static is a direct child of the root).
	const stdout = createStdout();

	function App({session}: {readonly session: number}) {
		const items = session === 1 ? ['old-A', 'old-B'] : ['new-C', 'new-D'];
		return (
			<Static key={session} items={items}>
				{item => <Text key={item}>{item}</Text>}
			</Static>
		);
	}

	const {rerender} = render(<App session={1} />, {stdout, debug: true});

	const afterFirstMount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterFirstMount.includes('old-A'),
		'first mount must emit its Static items',
	);
	t.assert.ok(
		afterFirstMount.includes('old-B'),
		'first mount must emit its Static items',
	);

	rerender(<App session={2} />);

	const afterRemount = (stdout.write as any).lastCall.args[0] as string;
	t.assert.ok(
		afterRemount.includes('new-C'),
		'remounted Static must emit "new-C" via removeChildFromContainer path',
	);
	t.assert.ok(
		afterRemount.includes('new-D'),
		'remounted Static must emit "new-D" via removeChildFromContainer path',
	);
});

test('render only new items in static output on final render', (t: TestContext) => {
	const stdout = createStdout();

	function Dynamic({items}: {readonly items: string[]}) {
		return (
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
		);
	}

	const {rerender, unmount} = render(<Dynamic items={[]} />, {
		stdout,
		debug: true,
	});

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], '');

	rerender(<Dynamic items={['A']} />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'A\n');

	rerender(<Dynamic items={['A', 'B']} />);
	unmount();

	// Filter out cursor management escapes (show/hide) to check content writes.
	// With isTTY=true, cli-cursor writes a show-cursor sequence on unmount.
	const allWrites = stdout.getWrites();
	const lastContentWrite = allWrites.findLast(
		w => w.length > 0 && !w.startsWith('\u{1B}[?25'),
	);
	t.assert.strictEqual(lastContentWrite, 'A\nB\n');
});

// See https://github.com/chalk/wrap-ansi/issues/27
test('ensure wrap-ansi doesn’t trim leading whitespace', (t: TestContext) => {
	const output = renderToString(<Text color="red">{' ERROR '}</Text>);

	t.assert.strictEqual(output, chalk.red(' ERROR '));
});

test('replace child node with text', (t: TestContext) => {
	const stdout = createStdout();

	function Dynamic({replace}: {readonly replace?: boolean}) {
		return <Text>{replace ? 'x' : <Text color="green">test</Text>}</Text>;
	}

	const {rerender} = render(<Dynamic />, {
		stdout,
		debug: true,
	});

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		chalk.green('test'),
	);

	rerender(<Dynamic replace />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'x');
});

// See https://github.com/vadimdemedes/ink/issues/145
test('disable raw mode when all input components are unmounted', async (t: TestContext) => {
	const stdout = createStdout();

	const stdin = createRawModeStdin();

	const options = {
		stdout,
		stdin,
		debug: true,
	};

	function Input({
		setRawMode,
	}: {
		readonly setRawMode: (isEnabled: boolean) => void;
	}) {
		useEffect(() => {
			setRawMode(true);

			return () => {
				setRawMode(false);
			};
		}, [setRawMode]);

		return <Text>Test</Text>;
	}

	function Test({
		renderFirstInput,
		renderSecondInput,
	}: {
		readonly renderFirstInput?: boolean;
		readonly renderSecondInput?: boolean;
	}) {
		const {setRawMode} = useStdin();

		return (
			<>
				{renderFirstInput ? <Input setRawMode={setRawMode} /> : null}
				{renderSecondInput ? <Input setRawMode={setRawMode} /> : null}
			</>
		);
	}

	const {rerender} = render(
		<Test renderFirstInput renderSecondInput />,
		options,
	);

	t.assert.strictEqual(stdin.setRawMode.calledOnce, true);
	t.assert.strictEqual(stdin.ref.calledOnce, true);
	t.assert.deepStrictEqual(stdin.setRawMode.firstCall.args, [true]);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);

	rerender(<Test renderFirstInput />);

	t.assert.strictEqual(stdin.setRawMode.calledOnce, true);
	t.assert.strictEqual(stdin.ref.calledOnce, true);
	t.assert.strictEqual(stdin.unref.notCalled, true);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);

	rerender(<Test />);
	t.assert.strictEqual(stdin.setRawMode.calledOnce, true);
	t.assert.strictEqual(stdin.unref.notCalled, true);
	t.assert.strictEqual(stdin.listenerCount('readable'), 0);

	await new Promise(resolve => {
		queueMicrotask(resolve);
	});

	t.assert.strictEqual(stdin.setRawMode.calledTwice, true);
	t.assert.strictEqual(stdin.ref.calledOnce, true);
	t.assert.strictEqual(stdin.unref.calledOnce, true);
	t.assert.deepStrictEqual(stdin.setRawMode.lastCall.args, [false]);
});

test('do not disable raw mode when swapping components that use useInput', async (t: TestContext) => {
	const stdout = createStdout();

	const stdin = createRawModeStdin();

	const options = {
		stdout,
		stdin,
		debug: true,
	};

	function StepA() {
		useInput(() => {});
		return <Text>A</Text>;
	}

	function StepB() {
		useInput(() => {});
		return <Text>B</Text>;
	}

	function Test({step}: {readonly step: number}) {
		return step === 1 ? <StepA /> : <StepB />;
	}

	const {rerender} = render(<Test step={1} />, options);

	t.assert.strictEqual(stdin.setRawMode.calledOnce, true);
	t.assert.strictEqual(stdin.ref.calledOnce, true);
	t.assert.deepStrictEqual(stdin.setRawMode.firstCall.args, [true]);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);

	rerender(<Test step={2} />);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);

	await new Promise(resolve => {
		queueMicrotask(resolve);
	});

	t.assert.strictEqual(stdin.unref.notCalled, true);
	t.assert.deepStrictEqual(stdin.setRawMode.lastCall.args, [true]);
	t.assert.strictEqual(stdin.listenerCount('readable'), 1);
});

test('clear pending input parser state when swapping components that use useInput', async (t: TestContext) => {
	const clock = FakeTimers.install({
		toFake: ['setTimeout', 'clearTimeout'],
	});

	try {
		const stdout = createStdout();

		const stdin = createRawModeStdin();

		const options = {
			stdout,
			stdin,
			debug: true,
		};

		const receivedInputs: string[] = [];

		function StepA() {
			useInput(() => {});
			return <Text>A</Text>;
		}

		function StepB() {
			useInput(input => {
				receivedInputs.push(input);
			});

			return <Text>B</Text>;
		}

		function Test({step}: {readonly step: number}) {
			return step === 1 ? <StepA /> : <StepB />;
		}

		const {rerender} = render(<Test step={1} />, options);

		emitReadable(stdin, '\u{1B}[');
		rerender(<Test step={2} />);

		await new Promise(resolve => {
			queueMicrotask(resolve);
		});

		await clock.tickAsync(20);

		t.assert.deepStrictEqual(receivedInputs, []);
	} finally {
		clock.uninstall();
	}
});

test('re-ref stdin when input is used after previous unmount', (t: TestContext) => {
	const stdin = createRawModeStdin();

	const options = {
		stdout: createStdout(),
		stdin,
		debug: true,
	};

	function Input({
		setRawMode,
	}: {
		readonly setRawMode: (isEnabled: boolean) => void;
	}) {
		useEffect(() => {
			setRawMode(true);

			return () => {
				setRawMode(false);
			};
		}, [setRawMode]);

		return <Text>Test</Text>;
	}

	function Test({onInput}: {readonly onInput: (input: string) => void}) {
		const {setRawMode} = useStdin();
		useInput(input => {
			onInput(input);
		});

		return <Input setRawMode={setRawMode} />;
	}

	const onFirstMountInput = spy();
	const onSecondMountInput = spy();

	// First render
	const {unmount} = render(<Test onInput={onFirstMountInput} />, options);

	t.assert.strictEqual(stdin.ref.calledOnce, true);
	t.assert.strictEqual(stdin.setRawMode.calledOnce, true);
	t.assert.deepStrictEqual(stdin.setRawMode.firstCall.args, [true]);
	emitReadable(stdin, 'a');
	t.assert.strictEqual(onFirstMountInput.callCount, 1);
	t.assert.deepStrictEqual(onFirstMountInput.firstCall.args, ['a']);

	// Unmount first instance
	unmount();

	t.assert.strictEqual(stdin.unref.calledOnce, true);
	t.assert.strictEqual(stdin.setRawMode.calledTwice, true);
	t.assert.deepStrictEqual(stdin.setRawMode.lastCall.args, [false]);

	// Second render with new Ink instance reusing the same stdin
	const {unmount: unmount2} = render(
		<Test onInput={onSecondMountInput} />,
		options,
	);

	t.assert.strictEqual(stdin.ref.calledTwice, true);
	t.assert.strictEqual(stdin.setRawMode.calledThrice, true);
	t.assert.deepStrictEqual(stdin.setRawMode.lastCall.args, [true]);
	emitReadable(stdin, 'b');
	t.assert.strictEqual(onSecondMountInput.callCount, 1);
	t.assert.deepStrictEqual(onSecondMountInput.firstCall.args, ['b']);
	t.assert.strictEqual(onFirstMountInput.callCount, 1);

	// Unmount second instance
	unmount2();

	t.assert.strictEqual(stdin.unref.calledTwice, true);
	t.assert.strictEqual(stdin.setRawMode.callCount, 4);
	t.assert.deepStrictEqual(stdin.setRawMode.lastCall.args, [false]);
});

test('setRawMode() should throw if raw mode is not supported', (t: TestContext) => {
	const stdout = createStdout();

	const stdin = new EventEmitter() as NodeJS.ReadStream;
	stdin.setEncoding = () => {};
	stdin.setRawMode = spy();
	stdin.isTTY = false;

	const didCatchInMount = spy();
	const didCatchInUnmount = spy();

	const options = {
		stdout,
		stdin,
		debug: true,
	};

	function Input({
		setRawMode,
	}: {
		readonly setRawMode: (isEnabled: boolean) => void;
	}) {
		useEffect(() => {
			try {
				setRawMode(true);
			} catch (error: unknown) {
				didCatchInMount(error);
			}

			return () => {
				try {
					setRawMode(false);
				} catch (error: unknown) {
					didCatchInUnmount(error);
				}
			};
		}, [setRawMode]);

		return <Text>Test</Text>;
	}

	function Test() {
		const {setRawMode} = useStdin();
		return <Input setRawMode={setRawMode} />;
	}

	const {unmount} = render(<Test />, options);
	unmount();

	t.assert.strictEqual(didCatchInMount.callCount, 1);
	t.assert.strictEqual(didCatchInUnmount.callCount, 1);
	t.assert.strictEqual(stdin.setRawMode.called, false);
});

test('render different component based on whether stdin is a TTY or not', (t: TestContext) => {
	const stdout = createStdout();

	const stdin = new EventEmitter() as NodeJS.WriteStream;
	stdin.setEncoding = () => {};
	stdin.setRawMode = spy();
	stdin.isTTY = false;

	const options = {
		stdout,
		stdin,
		debug: true,
	};

	function Input({
		setRawMode,
	}: {
		readonly setRawMode: (isEnabled: boolean) => void;
	}) {
		useEffect(() => {
			setRawMode(true);

			return () => {
				setRawMode(false);
			};
		}, [setRawMode]);

		return <Text>Test</Text>;
	}

	function Test({
		renderFirstInput,
		renderSecondInput,
	}: {
		readonly renderFirstInput?: boolean;
		readonly renderSecondInput?: boolean;
	}) {
		const {isRawModeSupported, setRawMode} = useStdin();

		return (
			<>
				{isRawModeSupported && renderFirstInput ? (
					<Input setRawMode={setRawMode} />
				) : null}
				{isRawModeSupported && renderSecondInput ? (
					<Input setRawMode={setRawMode} />
				) : null}
			</>
		);
	}

	const {rerender} = render(
		<Test renderFirstInput renderSecondInput />,
		options,
	);

	t.assert.strictEqual(stdin.setRawMode.called, false);

	rerender(<Test renderFirstInput />);

	t.assert.strictEqual(stdin.setRawMode.called, false);

	rerender(<Test />);

	t.assert.strictEqual(stdin.setRawMode.called, false);
});

test('render only last frame when run in CI', async (t: TestContext) => {
	const output = await run('ci', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true'},
		columns: 0,
	});

	for (const count of [0, 1, 2, 3, 4]) {
		t.assert.strictEqual(output.includes(`Counter: ${count}`), false);
	}

	t.assert.ok(output.includes('Counter: 5'));
});

test('render all frames if CI environment variable equals false', async (t: TestContext) => {
	const output = await run('ci', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
		columns: 0,
	});

	for (const count of [0, 1, 2, 3, 4, 5]) {
		t.assert.ok(output.includes(`Counter: ${count}`));
	}
});

test('debug mode in CI does not replay final frame during unmount teardown', async (t: TestContext) => {
	const output = await run('ci-debug', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true'},
		columns: 0,
	});

	const plainOutput = stripAnsi(output).replaceAll('\r', '');
	const helloCount = plainOutput.match(/Hello/g)?.length ?? 0;

	t.assert.strictEqual(helloCount, 2);
});

test('debug mode in CI keeps final newline separation after waitUntilExit', async (t: TestContext) => {
	const output = await run('ci-debug-after-exit', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true'},
		columns: 0,
	});

	const plainOutput = stripAnsi(output).replaceAll('\r', '');
	t.assert.strictEqual(plainOutput, 'HelloHello\nDONE');
});

test('render only last frame when stdout is not a TTY', async (t: TestContext) => {
	const stdout = createStdout(100, false);

	function Counter() {
		const [count, setCount] = useState(0);

		React.useEffect(() => {
			if (!(count < 3)) {
				return;
			}

			const timer = setTimeout(() => {
				setCount(c => c + 1);
			}, 10);

			return () => {
				clearTimeout(timer);
			};
		}, [count]);

		return <Text>Count: {count}</Text>;
	}

	const {unmount, waitUntilExit} = render(<Counter />, {
		stdout,
		debug: false,
	});

	await new Promise(resolve => {
		setTimeout(resolve, 200);
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	// Verify no intermediate frames were written
	const contentWrites = allWrites.map(w => stripAnsi(w));
	for (const intermediate of ['Count: 0', 'Count: 1', 'Count: 2']) {
		t.assert.strictEqual(
			contentWrites.some(w => w.includes(intermediate)),
			false,
			`Intermediate frame "${intermediate}" should not be written in non-interactive mode`,
		);
	}

	// Verify no erase/cursor ANSI sequences were emitted
	const hasEraseSequence = allWrites.some(w =>
		w.includes(ansiEscapes.eraseLines(1)),
	);
	t.assert.strictEqual(hasEraseSequence, false);

	// Verify the final frame is written
	const lastWrite = allWrites.findLast(w => w.length > 0) ?? '';
	t.assert.ok(lastWrite.includes('Count: 3'));
});

test('render all frames when interactive is explicitly true', async (t: TestContext) => {
	const stdout = createStdout(100, false);

	function Counter() {
		const [count, setCount] = useState(0);

		React.useEffect(() => {
			if (!(count < 2)) {
				return;
			}

			const timer = setTimeout(() => {
				setCount(c => c + 1);
			}, 50);

			return () => {
				clearTimeout(timer);
			};
		}, [count]);

		return <Text>Count: {count}</Text>;
	}

	const {unmount, waitUntilExit} = render(<Counter />, {
		stdout,
		debug: false,
		interactive: true,
	});

	await new Promise(resolve => {
		setTimeout(resolve, 500);
	});

	unmount();
	await waitUntilExit();

	const contentWrites = stdout.getWrites().filter(w => w.length > 0);
	t.assert.ok(contentWrites.length > 1);
	const joined = contentWrites.join('');
	t.assert.ok(joined.includes('Count: 0'));
	t.assert.ok(joined.includes('Count: 1'));
	t.assert.ok(joined.includes('Count: 2'));
});

test('interactive option overrides TTY detection', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	function Counter() {
		const [count, setCount] = useState(0);

		React.useEffect(() => {
			if (!(count < 3)) {
				return;
			}

			const timer = setTimeout(() => {
				setCount(c => c + 1);
			}, 10);

			return () => {
				clearTimeout(timer);
			};
		}, [count]);

		return <Text>Count: {count}</Text>;
	}

	const {unmount, waitUntilExit} = render(<Counter />, {
		stdout,
		debug: false,
		interactive: false,
	});

	await new Promise(resolve => {
		setTimeout(resolve, 200);
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	// Verify no intermediate frames were written
	const contentWrites = allWrites.map(w => stripAnsi(w));
	for (const intermediate of ['Count: 0', 'Count: 1', 'Count: 2']) {
		t.assert.strictEqual(
			contentWrites.some(w => w.includes(intermediate)),
			false,
			`Intermediate frame "${intermediate}" should not be written when interactive=false overrides TTY`,
		);
	}

	// Verify no erase/cursor ANSI sequences were emitted
	const hasEraseSequence = allWrites.some(w =>
		w.includes(ansiEscapes.eraseLines(1)),
	);
	t.assert.strictEqual(hasEraseSequence, false);

	// Verify only the final frame is written
	const lastWrite = allWrites.findLast(w => w.length > 0) ?? '';
	t.assert.ok(lastWrite.includes('Count: 3'));
});

test('alternate screen - enters on mount and exits on unmount', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		alternateScreen: true,
		interactive: true,
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	const enterIndex = allWrites.findIndex(w =>
		w.includes(ansiEscapes.enterAlternativeScreen),
	);
	const exitIndex = allWrites.findLastIndex(w =>
		w.includes(ansiEscapes.exitAlternativeScreen),
	);

	t.assert.notStrictEqual(
		enterIndex,
		-1,
		'Should write enterAlternativeScreen on mount',
	);
	t.assert.notStrictEqual(
		exitIndex,
		-1,
		'Should write exitAlternativeScreen on unmount',
	);
	t.assert.ok(
		enterIndex < exitIndex,
		'enterAlternativeScreen must come before exitAlternativeScreen',
	);
	t.assert.strictEqual(
		enterIndex,
		0,
		'enterAlternativeScreen should be the first write',
	);
});

test('primary screen - cleanup console output follows the native console during unmount', async (t: TestContext) => {
	const stdout = createStdout(100, true);
	const processStdoutWriteStub = stub(process.stdout, 'write').callsFake(
		(
			_chunk: string | Uint8Array,
			encoding?: BufferEncoding | ((error?: Error) => void),
			callback?: (error?: Error) => void,
		) => {
			if (typeof encoding === 'function') {
				encoding();
			}

			if (typeof callback === 'function') {
				callback();
			}

			return true;
		},
	);
	t.after(() => {
		processStdoutWriteStub.restore();
	});

	function Test() {
		useEffect(
			() => () => {
				console.log('primary cleanup');
			},
			[],
		);

		return <Text>Hello</Text>;
	}

	const {unmount, waitUntilExit} = render(<Test />, {
		stdout,
		interactive: true,
	});

	unmount();
	await waitUntilExit();

	const output = stdout.getWrites().join('');
	const hasNativeConsoleLog = processStdoutWriteStub
		.getCalls()
		.some(call => String(call.args[0]).includes('primary cleanup'));

	t.assert.strictEqual(
		output.includes('primary cleanup'),
		false,
		'Should keep cleanup console output out of Ink-managed stdout writes',
	);
	t.assert.ok(
		hasNativeConsoleLog,
		'Should restore the native console before React cleanup runs',
	);
});

test('alternate screen - does not replay exit(Error) output on the primary screen during unmount', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			exit(new Error('Done'));
		}, [exit]);

		return <Text>Done</Text>;
	}

	const {waitUntilExit} = render(<Test />, {
		stdout,
		alternateScreen: true,
		interactive: true,
	});

	await t.assert.rejects(waitUntilExit(), Error);

	const allWrites = stdout.getWrites();
	const exitIndex = allWrites.findLastIndex(write =>
		write.includes(ansiEscapes.exitAlternativeScreen),
	);
	const didReplayErrorOutput = allWrites.slice(exitIndex + 1).some(write => {
		const plainWrite = stripAnsi(write);
		return (
			plainWrite.includes('Error: Done') || plainWrite.includes('Done\n    at')
		);
	});

	t.assert.notStrictEqual(
		exitIndex,
		-1,
		'Should exit the alternate screen on unmount',
	);
	t.assert.strictEqual(
		didReplayErrorOutput,
		false,
		'Should not replay alternate-screen diagnostics onto the primary screen',
	);
});

test('alternate screen - does not replay teardown output on the primary screen during unmount', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	function Test() {
		const {exit} = useApp();

		useEffect(() => {
			exit(new Error('Done'));
		}, [exit]);

		return <Text>normal ERROR banner</Text>;
	}

	const {waitUntilExit} = render(<Test />, {
		stdout,
		alternateScreen: true,
		interactive: true,
	});

	await t.assert.rejects(waitUntilExit(), Error);

	const allWrites = stdout.getWrites();
	const exitIndex = allWrites.findLastIndex(write =>
		write.includes(ansiEscapes.exitAlternativeScreen),
	);
	const replayedOutput = stripAnsi(allWrites.slice(exitIndex + 1).join(''));

	t.assert.notStrictEqual(
		exitIndex,
		-1,
		'Should exit the alternate screen on unmount',
	);
	t.assert.strictEqual(
		replayedOutput.includes('normal ERROR banner') ||
			replayedOutput.includes('Error: Done') ||
			replayedOutput.includes('Done\n    at'),
		false,
		'Should not replay alternate-screen teardown output onto the primary screen',
	);
});

test('alternate screen - cleanup console output follows the native console during unmount', async (t: TestContext) => {
	const stdout = createStdout(100, true);
	const processStdoutWriteStub = stub(process.stdout, 'write').callsFake(
		(
			_chunk: string | Uint8Array,
			encoding?: BufferEncoding | ((error?: Error) => void),
			callback?: (error?: Error) => void,
		) => {
			if (typeof encoding === 'function') {
				encoding();
			}

			if (typeof callback === 'function') {
				callback();
			}

			return true;
		},
	);
	t.after(() => {
		processStdoutWriteStub.restore();
	});

	function Test() {
		useEffect(
			() => () => {
				console.log('cleanup log');
			},
			[],
		);

		return <Text>Hello</Text>;
	}

	const {unmount, waitUntilExit} = render(<Test />, {
		stdout,
		alternateScreen: true,
		interactive: true,
	});

	unmount();
	await waitUntilExit();

	const output = stdout.getWrites().join('');
	const hasNativeConsoleLog = processStdoutWriteStub
		.getCalls()
		.some(call => String(call.args[0]).includes('cleanup log'));

	t.assert.strictEqual(
		output.includes('cleanup log'),
		false,
		'Should keep cleanup console output out of the alternate-screen stream',
	);
	t.assert.ok(
		hasNativeConsoleLog,
		'Should restore the native console before React cleanup runs',
	);
});

test('alternate screen - cleanup() exits the alternate screen', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	const {cleanup, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		alternateScreen: true,
		interactive: true,
	});

	cleanup();
	await waitUntilExit();

	const allWrites = stdout.getWrites();
	const exitIndex = allWrites.findLastIndex(write =>
		write.includes(ansiEscapes.exitAlternativeScreen),
	);

	t.assert.notStrictEqual(
		exitIndex,
		-1,
		'Should exit the alternate screen during cleanup()',
	);
});

test('alternate screen - debug concurrent teardown restores the cursor before the first commit', async (t: TestContext) => {
	const stdout = createStdout(100, true);
	const showCursorEscape = '\u{1B}[?25h';

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		alternateScreen: true,
		concurrent: true,
		debug: true,
	});

	unmount();
	await waitUntilExit();

	const output = stdout.getWrites().join('');
	const exitIndex = output.lastIndexOf(ansiEscapes.exitAlternativeScreen);
	const showCursorIndex = output.lastIndexOf(showCursorEscape);

	t.assert.notStrictEqual(
		exitIndex,
		-1,
		'Should exit the alternate screen on unmount',
	);
	t.assert.ok(
		showCursorIndex > exitIndex,
		'Should restore the cursor after leaving the alternate screen',
	);
});

test('render warns when stdout is reused before unmount', async (t: TestContext) => {
	const stdout = createStdout(100, true);
	const processStderrWriteStub = stub(process.stderr, 'write').callsFake(
		(
			_chunk: string | Uint8Array,
			encoding?: BufferEncoding | ((error?: Error) => void),
			callback?: (error?: Error) => void,
		) => {
			if (typeof encoding === 'function') {
				encoding();
			}

			if (typeof callback === 'function') {
				callback();
			}

			return true;
		},
	);
	t.after(() => {
		processStderrWriteStub.restore();
	});

	render(<Text>Primary screen</Text>, {
		stdout,
		interactive: true,
		alternateScreen: true,
		patchConsole: false,
	});

	const {unmount, waitUntilExit} = render(<Text>Second render</Text>, {
		stdout,
	});

	t.assert.ok(
		processStderrWriteStub.calledOnceWithExactly(
			'Warning: render() was called again for the same stdout before the previous Ink instance was unmounted. Reusing stdout across multiple render() calls is unsupported. Call unmount() first.\n',
		),
	);

	unmount();
	await waitUntilExit();
});

test('alternate screen - ignored when non-interactive', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		alternateScreen: true,
		interactive: false,
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.enterAlternativeScreen)),
		false,
		'Should not write enterAlternativeScreen in non-interactive mode',
	);
	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.exitAlternativeScreen)),
		false,
		'Should not write exitAlternativeScreen in non-interactive mode',
	);
});

test('alternate screen - disabled by default', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		interactive: true,
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.enterAlternativeScreen)),
		false,
		'Should not write enterAlternativeScreen by default',
	);
	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.exitAlternativeScreen)),
		false,
		'Should not write exitAlternativeScreen by default',
	);
});

test('alternate screen - content is rendered between enter and exit', async (t: TestContext) => {
	const stdout = createStdout(100, true);

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		alternateScreen: true,
		interactive: true,
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	const enterIndex = allWrites.findIndex(w =>
		w.includes(ansiEscapes.enterAlternativeScreen),
	);
	const exitIndex = allWrites.findLastIndex(w =>
		w.includes(ansiEscapes.exitAlternativeScreen),
	);

	t.assert.notStrictEqual(enterIndex, -1);
	t.assert.notStrictEqual(exitIndex, -1);
	t.assert.ok(enterIndex < exitIndex);

	const hasContentBetween = allWrites
		.slice(enterIndex + 1, exitIndex)
		.some(w => stripAnsi(w).includes('Hello'));
	t.assert.ok(
		hasContentBetween,
		'Rendered content should appear between enter and exit',
	);
});

test('alternate screen - ignored when isTTY is false', async (t: TestContext) => {
	const stdout = createStdout(100, false);

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		alternateScreen: true,
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.enterAlternativeScreen)),
		false,
		'Should not write enterAlternativeScreen when isTTY is false',
	);
	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.exitAlternativeScreen)),
		false,
		'Should not write exitAlternativeScreen when isTTY is false',
	);
});

test('alternate screen - ignored when isTTY is false even if interactive is true', async (t: TestContext) => {
	const stdout = createStdout(100, false);

	const {unmount, waitUntilExit} = render(<Text>Hello</Text>, {
		stdout,
		alternateScreen: true,
		interactive: true,
	});

	unmount();
	await waitUntilExit();

	const allWrites = stdout.getWrites();

	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.enterAlternativeScreen)),
		false,
		'Should not write enterAlternativeScreen when isTTY is false, even with interactive=true',
	);
	t.assert.strictEqual(
		allWrites.some(w => w.includes(ansiEscapes.exitAlternativeScreen)),
		false,
		'Should not write exitAlternativeScreen when isTTY is false, even with interactive=true',
	);
});

test('static output is written immediately in non-interactive mode', async (t: TestContext) => {
	const stdout = createStdout(100, false);

	function App() {
		const [items, setItems] = useState(['A']);

		React.useEffect(() => {
			const timer = setTimeout(() => {
				setItems(['A', 'B']);
			}, 10);

			return () => {
				clearTimeout(timer);
			};
		}, []);

		return (
			<Box>
				<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
				<Text>Dynamic</Text>
			</Box>
		);
	}

	const {unmount, waitUntilExit} = render(<App />, {
		stdout,
		debug: false,
	});

	await new Promise(resolve => {
		setTimeout(resolve, 200);
	});

	// Capture writes BEFORE unmount — static items must already be here
	const writesBeforeUnmount = stdout.getWrites().map(w => stripAnsi(w));
	const preUnmountJoined = writesBeforeUnmount.join('');
	t.assert.ok(
		preUnmountJoined.includes('A'),
		'Static item A was written before unmount',
	);
	t.assert.ok(
		preUnmountJoined.includes('B'),
		'Static item B was written before unmount',
	);

	unmount();
	await waitUntilExit();

	// Verify the dynamic content was deferred to unmount (not written before it)
	t.assert.strictEqual(
		preUnmountJoined.includes('Dynamic'),
		false,
		'Dynamic content was not written before unmount',
	);

	// Verify dynamic content was eventually written
	const allWrites = stdout.getWrites().map(w => stripAnsi(w));
	t.assert.ok(
		allWrites.join('').includes('Dynamic'),
		'Dynamic content was eventually written',
	);
});

test('reset prop when it’s removed from the element', (t: TestContext) => {
	const stdout = createStdout();

	function Dynamic({remove}: {readonly remove?: boolean}) {
		return (
			<Box
				flexDirection="column"
				justifyContent="flex-end"
				height={remove ? undefined : 4}
			>
				<Text>x</Text>
			</Box>
		);
	}

	const {rerender} = render(<Dynamic />, {
		stdout,
		debug: true,
	});

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], '\n\n\nx');

	rerender(<Dynamic remove />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'x');
});

test('newline', (t: TestContext) => {
	const output = renderToString(
		<Text>
			Hello
			<Newline />
			World
		</Text>,
	);
	t.assert.strictEqual(output, 'Hello\nWorld');
});

test('multiple newlines', (t: TestContext) => {
	const output = renderToString(
		<Text>
			Hello
			<Newline count={2} />
			World
		</Text>,
	);
	t.assert.strictEqual(output, 'Hello\n\nWorld');
});

test('horizontal spacer', (t: TestContext) => {
	const output = renderToString(
		<Box width={20}>
			<Text>Left</Text>
			<Spacer />
			<Text>Right</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Left           Right');
});

test('vertical spacer', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" height={6}>
			<Text>Top</Text>
			<Spacer />
			<Text>Bottom</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Top\n\n\n\n\nBottom');
});

test('link ansi escapes are closed properly', (t: TestContext) => {
	const output = renderToString(
		<Text>{ansiEscapes.link('Example', 'https://example.com')}</Text>,
	);

	t.assert.strictEqual(output, ']8;;https://example.comExample]8;;');
});

// Concurrent mode tests
test('text - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(<Text>Hello World</Text>);
	t.assert.strictEqual(output, 'Hello World');
});

test('multiple text nodes - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Text>
			Hello
			{' World'}
		</Text>,
	);
	t.assert.strictEqual(output, 'Hello World');
});

test('wrap text - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box width={7}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);
	t.assert.strictEqual(output, 'Hello\nWorld');
});

test('truncate text in the end - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box width={7}>
			<Text wrap="truncate">Hello World</Text>
		</Box>,
	);
	t.assert.strictEqual(output, 'Hello …');
});

test('transform children - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Transform
			transform={(string: string, index: number) => `[${index}: ${string}]`}
		>
			<Text>
				<Transform
					transform={(string: string, index: number) => `{${index}: ${string}}`}
				>
					<Text>test</Text>
				</Transform>
			</Text>
		</Transform>,
	);
	t.assert.strictEqual(output, '[0: {0: test}]');
});

test('static output - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box>
			<Static items={['A', 'B', 'C']} style={{paddingBottom: 1}}>
				{letter => <Text key={letter}>{letter}</Text>}
			</Static>

			<Box marginTop={1}>
				<Text>X</Text>
			</Box>
		</Box>,
	);
	t.assert.strictEqual(output, 'A\nB\nC\n\n\nX');
});

test('remeasure text dimensions on text change - concurrent', async (t: TestContext) => {
	const {getOutput, rerenderAsync} = await renderAsync(
		<Box>
			<Text>Hello</Text>
		</Box>,
	);
	t.assert.strictEqual(getOutput(), 'Hello');

	await rerenderAsync(
		<Box>
			<Text>Hello World</Text>
		</Box>,
	);
	t.assert.strictEqual(getOutput(), 'Hello World');
});

test('newline - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Text>
			Hello
			<Newline />
			World
		</Text>,
	);
	t.assert.strictEqual(output, 'Hello\nWorld');
});

test('horizontal spacer - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box width={20}>
			<Text>Left</Text>
			<Spacer />
			<Text>Right</Text>
		</Box>,
	);
	t.assert.strictEqual(output, 'Left           Right');
});

test('vertical spacer - concurrent', async (t: TestContext) => {
	const output = await renderToStringAsync(
		<Box flexDirection="column" height={6}>
			<Text>Top</Text>
			<Spacer />
			<Text>Bottom</Text>
		</Box>,
	);
	t.assert.strictEqual(output, 'Top\n\n\n\n\nBottom');
});
