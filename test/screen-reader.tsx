import test, {type TestContext} from 'node:test';
import React from 'react';
import chalk from 'chalk';
import ansiEscapes from 'ansi-escapes';
import {
	Box,
	Text,
	Transform,
	Static,
	render,
	useStdout,
	useStderr,
} from '../src/index.js';
import {bsu, esu} from '../src/write-synchronized.js';
import {renderToString} from './helpers/render-to-string.js';
import createStdout from './helpers/create-stdout.js';

test('omit Static content inside a hidden ancestor from screen-reader output', (t: TestContext) => {
	const output = renderToString(
		<>
			<Box display="none">
				<Box>
					<Static items={['Hidden']}>
						{item => <Text key={item}>{item}</Text>}
					</Static>
				</Box>
			</Box>
			<Text>Visible</Text>
		</>,
		{isScreenReaderEnabled: true},
	);

	t.assert.strictEqual(output, 'Visible');
});

test('omit nested Text styling from screen-reader output', (t: TestContext) => {
	const previousColorLevel = chalk.level;
	chalk.level = 3;
	t.after(() => {
		chalk.level = previousColorLevel;
	});

	const element = (
		<Text>
			Status: <Text color="green">Ready</Text>
		</Text>
	);

	t.assert.strictEqual(
		renderToString(element, {isScreenReaderEnabled: true}),
		'Status: Ready',
	);
	t.assert.strictEqual(
		renderToString(element),
		`Status: ${chalk.green('Ready')}`,
	);
});

test('preserve nested Transform accessibility labels for screen readers', (t: TestContext) => {
	const element = (
		<Text>
			Status:{' '}
			<Transform
				accessibilityLabel="Ready"
				transform={text => '*'.repeat(text.length)}
			>
				<Text>ready</Text>
			</Transform>
		</Text>
	);

	t.assert.strictEqual(
		renderToString(element, {isScreenReaderEnabled: true}),
		'Status: Ready',
	);
	t.assert.strictEqual(renderToString(element), 'Status: *****');
});

test('honor empty Transform accessibility labels for screen readers', (t: TestContext) => {
	const element = (
		<Text>
			<Transform accessibilityLabel="" transform={text => text.toUpperCase()}>
				<Text>decorative</Text>
			</Transform>
			Ready
		</Text>
	);

	t.assert.strictEqual(
		renderToString(element, {isScreenReaderEnabled: true}),
		'Ready',
	);
	t.assert.strictEqual(renderToString(element), 'DECORATIVEReady');
});

test('render text for screen readers', (t: TestContext) => {
	const output = renderToString(
		<Box aria-label="Hello World">
			<Text>Not visible to screen readers</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Hello World');
});

test('render text for screen readers with aria-hidden', (t: TestContext) => {
	const output = renderToString(
		<Box aria-hidden>
			<Text>Not visible to screen readers</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, '');
});

test('render text for screen readers with aria-role', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="button">
			<Text>Click me</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'button: Click me');
});

test('render select input for screen readers', (t: TestContext) => {
	const items = ['Red', 'Green', 'Blue'];

	const output = renderToString(
		<Box aria-role="list" flexDirection="column">
			<Text>Select a color:</Text>
			{items.map((item, index) => {
				const isSelected = index === 1;
				const screenReaderLabel = `${index + 1}. ${item}`;

				return (
					<Box
						key={item}
						aria-label={screenReaderLabel}
						aria-role="listitem"
						aria-state={{selected: isSelected}}
					>
						<Text>{item}</Text>
					</Box>
				);
			})}
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(
		output,
		'list: Select a color:\nlistitem: 1. Red\nlistitem: (selected) 2. Green\nlistitem: 3. Blue',
	);
});

test('render aria-label only Text for screen readers', (t: TestContext) => {
	const output = renderToString(<Text aria-label="Screen-reader only" />, {
		isScreenReaderEnabled: true,
	});

	t.assert.strictEqual(output, 'Screen-reader only');
});

test('render aria-label only Box for screen readers', (t: TestContext) => {
	const output = renderToString(<Box aria-label="Screen-reader only" />, {
		isScreenReaderEnabled: true,
	});

	t.assert.strictEqual(output, 'Screen-reader only');
});

test('render accessibilityLabel only Transform for screen readers', (t: TestContext) => {
	const element = (
		<Transform
			accessibilityLabel="Screen-reader only"
			transform={text => text.toUpperCase()}
		/>
	);

	t.assert.strictEqual(
		renderToString(element, {isScreenReaderEnabled: true}),
		'Screen-reader only',
	);
	t.assert.strictEqual(renderToString(element), '');
});

test('omit ANSI styling in screen-reader output', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Text bold inverse underline color="green">
				Styled content
			</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Styled content');
});

test('skip nodes with display:none style in screen-reader output', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Box display="none">
				<Text>Hidden</Text>
			</Box>
			<Text>Visible</Text>
		</Box>,
		{isScreenReaderEnabled: true},
	);

	t.assert.strictEqual(output, 'Visible');
});

test('render multiple Text components', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Hello</Text>
			<Text>World</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Hello\nWorld');
});

test('render nested Box components with Text', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Hello</Text>
			<Box>
				<Text>World</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Hello\nWorld');
});

function NullComponent(): undefined {
	return undefined;
}

test('render component that returns null', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Hello</Text>
			<NullComponent />
			<Text>World</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Hello\nWorld');
});

test('render with aria-state.busy', (t: TestContext) => {
	const output = renderToString(
		<Box aria-state={{busy: true}}>
			<Text>Loading</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, '(busy) Loading');
});

test('render with aria-state.checked', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="checkbox" aria-state={{checked: true}}>
			<Text>Accept terms</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'checkbox: (checked) Accept terms');
});

test('render with aria-state.disabled', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="button" aria-state={{disabled: true}}>
			<Text>Submit</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'button: (disabled) Submit');
});

test('render with aria-state.expanded', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="combobox" aria-state={{expanded: true}}>
			<Text>Select</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'combobox: (expanded) Select');
});

test('render with aria-state.multiline', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="textbox" aria-state={{multiline: true}}>
			<Text>Hello</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'textbox: (multiline) Hello');
});

test('render with aria-state.multiselectable', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="listbox" aria-state={{multiselectable: true}}>
			<Text>Options</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'listbox: (multiselectable) Options');
});

test('render with aria-state.readonly', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="textbox" aria-state={{readonly: true}}>
			<Text>Hello</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'textbox: (readonly) Hello');
});

test('render with aria-state.required', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="textbox" aria-state={{required: true}}>
			<Text>Name</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'textbox: (required) Name');
});

test('render with aria-state.selected', (t: TestContext) => {
	const output = renderToString(
		<Box aria-role="option" aria-state={{selected: true}}>
			<Text>Blue</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'option: (selected) Blue');
});

test('render multi-line text', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Line 1</Text>
			<Text>Line 2</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Line 1\nLine 2');
});

test('render nested multi-line text', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="row">
			<Box flexDirection="column">
				<Text>Line 1</Text>
				<Text>Line 2</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Line 1\nLine 2');
});

test('render nested row', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box flexDirection="row">
				<Text>Line 1</Text>
				<Text>Line 2</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'Line 1 Line 2');
});

test('render multi-line text with roles', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column" aria-role="list">
			<Box aria-role="listitem">
				<Text>Item 1</Text>
			</Box>
			<Box aria-role="listitem">
				<Text>Item 2</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(output, 'list: listitem: Item 1\nlistitem: Item 2');
});

test('render listbox with multiselectable options', (t: TestContext) => {
	const output = renderToString(
		<Box
			flexDirection="column"
			aria-role="listbox"
			aria-state={{multiselectable: true}}
		>
			<Box aria-role="option" aria-state={{selected: true}}>
				<Text>Option 1</Text>
			</Box>
			<Box aria-role="option" aria-state={{selected: false}}>
				<Text>Option 2</Text>
			</Box>
			<Box aria-role="option" aria-state={{selected: true}}>
				<Text>Option 3</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.assert.strictEqual(
		output,
		'listbox: (multiselectable) option: (selected) Option 1\noption: Option 2\noption: (selected) Option 3',
	);
});

const contentWrites = (stdout: ReturnType<typeof createStdout>) =>
	stdout.getWrites().filter(write => write.length > 0);

test('restore screen-reader output after stdout writes without touching the cursor', async (t: TestContext) => {
	const stdout = createStdout(40, true);
	let write: (text: string) => void = () => {};
	function Test() {
		({write} = useStdout());
		return <Text>Hello</Text>;
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
	t.assert.deepStrictEqual(contentWrites(stdout), [bsu, 'Hello', esu]);

	write('External\n');

	t.assert.deepStrictEqual(contentWrites(stdout).slice(3), [
		bsu,
		ansiEscapes.eraseLines(1),
		'External\n',
		'Hello',
		esu,
	]);
});

test('restore screen-reader output after stderr writes without touching the cursor', async (t: TestContext) => {
	const stdout = createStdout(40, true);
	const stderr = createStdout(40, true);
	let write: (text: string) => void = () => {};
	function Test() {
		({write} = useStderr());
		return <Text>Hello</Text>;
	}

	const instance = render(<Test />, {
		stdout,
		stderr,
		interactive: true,
		isScreenReaderEnabled: true,
		patchConsole: false,
	});
	t.after(() => {
		instance.unmount();
	});
	await instance.waitUntilRenderFlush();

	write('External\n');

	t.assert.deepStrictEqual(contentWrites(stderr), ['External\n']);
	t.assert.deepStrictEqual(contentWrites(stdout).slice(3), [
		bsu,
		ansiEscapes.eraseLines(1),
		'Hello',
		esu,
	]);
});

test('restore screen-reader output after console.log without touching the cursor', async (t: TestContext) => {
	const stdout = createStdout(40, true);
	const instance = render(<Text>Hello</Text>, {
		stdout,
		interactive: true,
		isScreenReaderEnabled: true,
	});
	t.after(() => {
		instance.unmount();
	});
	await instance.waitUntilRenderFlush();

	console.log('External');

	t.assert.deepStrictEqual(contentWrites(stdout).slice(3), [
		bsu,
		ansiEscapes.eraseLines(1),
		'External\n',
		'Hello',
		esu,
	]);
});
