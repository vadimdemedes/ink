import test from 'ava';
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

test('render simple text', t => {
	const output = renderToString(<Text>Hello World</Text>);
	t.is(output, 'Hello World');
});

test('render text with variable', t => {
	const output = renderToString(<Text>Count: {42}</Text>);
	t.is(output, 'Count: 42');
});

test('render nested text components', t => {
	function World() {
		return <Text>World</Text>;
	}

	const output = renderToString(
		<Text>
			Hello <World />
		</Text>,
	);

	t.is(output, 'Hello World');
});

test('render empty fragment', t => {
	const output = renderToString(<></>); // eslint-disable-line react/jsx-no-useless-fragment
	t.is(output, '');
});

test('render null children', t => {
	const output = renderToString(<Text>{null}</Text>);
	t.is(output, '');
});

// ── Layout ──────────────────────────────────────────────

test('render box with padding', t => {
	const output = renderToString(
		<Box paddingLeft={2}>
			<Text>Padded</Text>
		</Box>,
	);

	t.is(output, '  Padded');
});

test('render box with flex direction row', t => {
	const output = renderToString(
		<Box>
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.is(output, 'ABC');
});

test('render box with flex direction column', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Line 1</Text>
			<Text>Line 2</Text>
		</Box>,
	);

	t.is(output, 'Line 1\nLine 2');
});

test('render margin', t => {
	const output = renderToString(
		<Box marginLeft={2}>
			<Text>Margined</Text>
		</Box>,
	);

	t.is(output, '  Margined');
});

test('render gap between items', t => {
	const output = renderToString(
		<Box gap={1}>
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.is(output, 'A B');
});

test('render box with fixed width and height', t => {
	const output = renderToString(
		<Box width={10} height={3}>
			<Text>Hi</Text>
		</Box>,
	);

	const lines = output.split('\n');
	t.is(lines.length, 3);
});

test('render spacer pushes content apart', t => {
	const output = renderToString(
		<Box width={20}>
			<Text>Left</Text>
			<Spacer />
			<Text>Right</Text>
		</Box>,
	);

	t.is(output, 'Left           Right');
});

test('render newline inserts blank line', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Above</Text>
			<Newline />
			<Text>Below</Text>
		</Box>,
	);

	t.is(output, 'Above\n\n\nBelow');
});

test('render box with border', t => {
	const output = renderToString(
		<Box borderStyle="single" width={20}>
			<Text>Bordered</Text>
		</Box>,
		{columns: 20},
	);

	t.is(
		output,
		boxen('Bordered', {
			width: 20,
			borderStyle: 'single',
		}),
	);
});

// ── Styling ─────────────────────────────────────────────

test('render colored text', t => {
	const output = renderToString(<Text color="green">Green</Text>);
	t.is(output, chalk.green('Green'));
});

test('render bold text', t => {
	const output = renderToString(<Text bold>Bold</Text>);
	t.is(output, chalk.bold('Bold'));
});

// ── Text wrapping and columns ───────────────────────────

test('render text with wrap', t => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);

	t.is(output, 'Hello\nWorld');
});

test('render text with truncate', t => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate">Hello World</Text>
		</Box>,
	);

	t.is(output, 'Hello …');
});

test('default columns is 80', t => {
	const longText = 'A'.repeat(100);
	const output = renderToString(<Text>{longText}</Text>);

	const lines = output.split('\n');
	t.is(lines.length, 2);
	t.is(lines[0], 'A'.repeat(80));
	t.is(lines[1], 'A'.repeat(20));
});

test('custom columns option', t => {
	const longText = 'A'.repeat(50);
	const output = renderToString(<Text>{longText}</Text>, {columns: 30});

	const lines = output.split('\n');
	t.is(lines.length, 2);
	t.is(lines[0], 'A'.repeat(30));
	t.is(lines[1], 'A'.repeat(20));
});

// ── Components ──────────────────────────────────────────

test('render Transform component', t => {
	const output = renderToString(
		<Transform transform={output => output.toUpperCase()}>
			<Text>hello</Text>
		</Transform>,
	);

	t.is(output, 'HELLO');
});

test('render Static component with items', t => {
	const items = ['A', 'B', 'C'];

	const output = renderToString(
		<Box flexDirection="column">
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
			<Text>Dynamic</Text>
		</Box>,
	);

	t.is(output, 'A\nB\nC\nDynamic');
});

// ── Effect behavior ─────────────────────────────────────

test('captures initial render output before effect-driven state updates', t => {
	function App() {
		const [text, setText] = useState('Initial');

		useEffect(() => {
			setText('Updated');
		}, []);

		return <Text>{text}</Text>;
	}

	const output = renderToString(<App />);
	t.is(output, 'Initial');
});

test('useLayoutEffect state updates are reflected in output', t => {
	function App() {
		const [text, setText] = useState('Initial');

		useLayoutEffect(() => {
			setText('Layout Updated');
		}, []);

		return <Text>{text}</Text>;
	}

	const output = renderToString(<App />);
	t.is(output, 'Layout Updated');
});

test('runs effect cleanup on teardown', t => {
	let cleanupRan = false;

	function App() {
		useEffect(() => {
			return () => {
				cleanupRan = true;
			};
		}, []);

		return <Text>Cleanup test</Text>;
	}

	const output = renderToString(<App />);
	t.is(output, 'Cleanup test');
	t.true(cleanupRan);
});

// ── Error handling ──────────────────────────────────────

test('component that throws propagates the error', t => {
	function Broken(): React.JSX.Element {
		throw new Error('Component error');
	}

	t.throws(() => renderToString(<Broken />), {message: 'Component error'});
});

test('text outside Text component throws', t => {
	t.throws(() => renderToString(<Box>{'raw text'}</Box>), {
		message: /must be rendered inside <Text>/,
	});
});

test('subsequent calls work after a component error', t => {
	function Broken(): React.JSX.Element {
		throw new Error('Boom');
	}

	t.throws(() => renderToString(<Broken />));
	const output = renderToString(<Text>Still works</Text>);
	t.is(output, 'Still works');
});

// ── Independence ────────────────────────────────────────

test('can be called multiple times independently', t => {
	const output1 = renderToString(<Text>First</Text>);
	const output2 = renderToString(<Text>Second</Text>);

	t.is(output1, 'First');
	t.is(output2, 'Second');
});

// ── Deeply nested tree ──────────────────────────────────

test('render deeply nested component tree', t => {
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

	t.true(output.includes('Nested'));
	t.true(output.includes('deep'));
});
