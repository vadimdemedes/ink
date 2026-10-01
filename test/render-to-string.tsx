import vm from 'node:vm';
import test, {type TestContext} from 'node:test';
import chalk from 'chalk';
import boxen from 'boxen';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
	Box,
	Text,
	Static,
	Transform,
	Newline,
	Spacer,
	renderToString,
} from '../src/index.js';

// ── Basic rendering ─────────────────────────────────────

test('render simple text', (t: TestContext) => {
	const output = renderToString(<Text>Hello World</Text>);
	t.assert.strictEqual(output, 'Hello World');
});

test('skip Static content inside a hidden ancestor', (t: TestContext) => {
	const output = renderToString(
		<>
			<Box display="none">
				<Static items={['Hidden']}>
					{item => (
						<Box key={item} borderStyle="single">
							<Text>{item}</Text>
						</Box>
					)}
				</Static>
			</Box>
			<Text>Visible</Text>
		</>,
	);

	t.assert.strictEqual(output, 'Visible');
});

test('render text with variable', (t: TestContext) => {
	const output = renderToString(<Text>Count: {42}</Text>);
	t.assert.strictEqual(output, 'Count: 42');
});

test('render nested text components', (t: TestContext) => {
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

test('render empty fragment', (t: TestContext) => {
	const output = renderToString(<></>); // eslint-disable-line @eslint-react/jsx-no-useless-fragment -- The empty fragment is what this test renders.
	t.assert.strictEqual(output, '');
});

test('render null children', (t: TestContext) => {
	const output = renderToString(<Text>{null}</Text>);
	t.assert.strictEqual(output, '');
});

// ── Layout ──────────────────────────────────────────────

test('render box with padding', (t: TestContext) => {
	const output = renderToString(
		<Box paddingLeft={2}>
			<Text>Padded</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '  Padded');
});

test('render box with flex direction row', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'ABC');
});

test('render box with flex direction column', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Line 1</Text>
			<Text>Line 2</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Line 1\nLine 2');
});

test('render margin', (t: TestContext) => {
	const output = renderToString(
		<Box marginLeft={2}>
			<Text>Margined</Text>
		</Box>,
	);

	t.assert.strictEqual(output, '  Margined');
});

test('render gap between items', (t: TestContext) => {
	const output = renderToString(
		<Box gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A B');
});

test('render box with fixed width and height', (t: TestContext) => {
	const output = renderToString(
		<Box width={10} height={3}>
			<Text>Hi</Text>
		</Box>,
	);

	const lines = output.split('\n');
	t.assert.strictEqual(lines.length, 3);
});

test('render spacer pushes content apart', (t: TestContext) => {
	const output = renderToString(
		<Box width={20}>
			<Text>Left</Text>
			<Spacer />
			<Text>Right</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Left           Right');
});

test('render newline inserts blank line', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Above</Text>
			<Newline />
			<Text>Below</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Above\n\n\nBelow');
});

test('render box with border', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="single" width={20}>
			<Text>Bordered</Text>
		</Box>,
		{columns: 20},
	);

	t.assert.strictEqual(
		output,
		boxen('Bordered', {
			width: 20,
			borderStyle: 'single',
		}),
	);
});

// ── Styling ─────────────────────────────────────────────

test('render colored text', (t: TestContext) => {
	const output = renderToString(<Text color="green">Green</Text>);
	t.assert.strictEqual(output, chalk.green('Green'));
});

test('render bold text', (t: TestContext) => {
	const output = renderToString(<Text bold>Bold</Text>);
	t.assert.strictEqual(output, chalk.bold('Bold'));
});

// ── Text wrapping and columns ───────────────────────────

test('render text with wrap', (t: TestContext) => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello\nWorld');
});

test('render text with truncate', (t: TestContext) => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate">Hello World</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'Hello …');
});

test('default columns is 80', (t: TestContext) => {
	const longText = 'A'.repeat(100);
	const output = renderToString(<Text>{longText}</Text>);

	const lines = output.split('\n');
	t.assert.strictEqual(lines.length, 2);
	t.assert.strictEqual(lines[0], 'A'.repeat(80));
	t.assert.strictEqual(lines[1], 'A'.repeat(20));
});

test('custom columns option', (t: TestContext) => {
	const longText = 'A'.repeat(50);
	const output = renderToString(<Text>{longText}</Text>, {columns: 30});

	const lines = output.split('\n');
	t.assert.strictEqual(lines.length, 2);
	t.assert.strictEqual(lines[0], 'A'.repeat(30));
	t.assert.strictEqual(lines[1], 'A'.repeat(20));
});

// ── Components ──────────────────────────────────────────

test('render Transform component', (t: TestContext) => {
	const output = renderToString(
		<Transform transform={output => output.toUpperCase()}>
			<Text>hello</Text>
		</Transform>,
	);

	t.assert.strictEqual(output, 'HELLO');
});

test('render Static component with items', (t: TestContext) => {
	const items = ['A', 'B', 'C'];

	const output = renderToString(
		<Box flexDirection="column">
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
			<Text>Dynamic</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nB\nC\nDynamic');
});

test('Static preserves its margins and all items', (t: TestContext) => {
	const output = renderToString(
		<Static
			items={['A', 'B']}
			style={{marginTop: 1, marginBottom: 1, marginLeft: 2}}
		>
			{item => <Text key={item}>{item}</Text>}
		</Static>,
	);

	t.assert.strictEqual(output, '\n  A\n  B\n');
});

test('render static-only output has no trailing newline', (t: TestContext) => {
	const items = ['A', 'B'];

	const output = renderToString(
		<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>,
	);

	t.assert.strictEqual(output, 'A\nB');
});

test('render static + dynamic output has exactly one newline between parts', (t: TestContext) => {
	const items = ['A', 'B'];

	const output = renderToString(
		<Box flexDirection="column">
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
			<Text>Dynamic</Text>
		</Box>,
	);

	t.assert.strictEqual(output, 'A\nB\nDynamic');
});

// ── Effect behavior ─────────────────────────────────────

test('captures initial render output before effect-driven state updates', (t: TestContext) => {
	function App() {
		const [text, setText] = useState('Initial');

		useEffect(() => {
			setText('Updated');
		}, []);

		return <Text>{text}</Text>;
	}

	const output = renderToString(<App />);
	t.assert.strictEqual(output, 'Initial');
});

test('useLayoutEffect state updates are reflected in output', (t: TestContext) => {
	function App() {
		const [text, setText] = useState('Initial');

		useLayoutEffect(() => {
			setText('Layout Updated');
		}, []);

		return <Text>{text}</Text>;
	}

	const output = renderToString(<App />);
	t.assert.strictEqual(output, 'Layout Updated');
});

test('runs effect cleanup on teardown', (t: TestContext) => {
	let didCleanupRun = false;

	function App() {
		useEffect(
			() => () => {
				didCleanupRun = true;
			},
			[],
		);

		return <Text>Cleanup test</Text>;
	}

	const output = renderToString(<App />);
	t.assert.strictEqual(output, 'Cleanup test');
	t.assert.ok(didCleanupRun);
});

// ── Error handling ──────────────────────────────────────

test('runs effect cleanup when a transform throws', (t: TestContext) => {
	const error = new Error('Transform failed');
	let setupCount = 0;
	let cleanupCount = 0;
	function Test() {
		useLayoutEffect(() => {
			setupCount++;
			return () => {
				cleanupCount++;
			};
		}, []);

		return (
			<Transform
				transform={() => {
					throw error;
				}}
			>
				<Text>Hello</Text>
			</Transform>
		);
	}

	t.assert.throws(
		() => renderToString(<Test />),
		caughtError => caughtError === error,
	);
	t.assert.strictEqual(setupCount, 1);
	t.assert.strictEqual(cleanupCount, 1);
	t.assert.strictEqual(renderToString(<Text>Still works</Text>), 'Still works');
});

test('component that throws propagates the error', (t: TestContext) => {
	function Broken(): React.JSX.Element {
		throw new Error('Component error');
	}

	t.assert.throws(() => renderToString(<Broken />), {
		message: 'Component error',
	});
});

test('preserves component errors from another realm', (t: TestContext) => {
	const error = vm.runInNewContext(
		'new TypeError("Invalid configuration")',
	) as Error;

	function Broken(): React.JSX.Element {
		throw error;
	}

	t.assert.throws(
		() => renderToString(<Broken />),
		caughtError => caughtError === error,
	);
	t.assert.strictEqual(renderToString(<Text>Still works</Text>), 'Still works');
});

test('component that throws undefined does not silently return empty output', (t: TestContext) => {
	function Broken(): React.JSX.Element {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw undefined;
	}

	t.assert.throws(() => renderToString(<Broken />), {message: 'undefined'});
	t.assert.strictEqual(renderToString(<Text>Still works</Text>), 'Still works');
});

test('text outside Text component throws', (t: TestContext) => {
	t.assert.throws(() => renderToString(<Box>raw text</Box>), {
		message: /must be rendered inside <Text>/,
	});
});

test('subsequent calls work after a component error', (t: TestContext) => {
	function Broken(): React.JSX.Element {
		throw new Error('Boom');
	}

	t.assert.throws(() => renderToString(<Broken />), Error);
	const output = renderToString(<Text>Still works</Text>);
	t.assert.strictEqual(output, 'Still works');
});

// ── Independence ────────────────────────────────────────

test('can be called multiple times independently', (t: TestContext) => {
	const output1 = renderToString(<Text>First</Text>);
	const output2 = renderToString(<Text>Second</Text>);

	t.assert.strictEqual(output1, 'First');
	t.assert.strictEqual(output2, 'Second');
});

// ── Deeply nested tree ──────────────────────────────────

test('render deeply nested component tree', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box paddingLeft={1}>
				<Box>
					<Text bold>
						{'Nested '}
						<Text color="green">deep</Text>
					</Text>
				</Box>
			</Box>
		</Box>,
	);

	t.assert.ok(output.includes('Nested'));
	t.assert.ok(output.includes('deep'));
});
