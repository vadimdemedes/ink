import EventEmitter from 'node:events';
import test from 'ava';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import React, {Component, useState} from 'react';
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

test('text', t => {
	const output = renderToString(<Text>Hello World</Text>);

	t.is(output, 'Hello World');
});

test('text with variable', t => {
	const output = renderToString(<Text>Count: {1}</Text>);

	t.is(output, 'Count: 1');
});

test('multiple text nodes', t => {
	const output = renderToString(
		<Text>
			{'Hello'}
			{' World'}
		</Text>,
	);

	t.is(output, 'Hello World');
});

test('text with component', t => {
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

test('text with fragment', t => {
	const output = renderToString(
		<Text>
			Hello <>World</> {/* eslint-disable-line react/jsx-no-useless-fragment */}
		</Text>,
	);

	t.is(output, 'Hello World');
});

test('wrap text', t => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);

	t.is(output, 'Hello\nWorld');
});

test('don’t wrap text if there is enough space', t => {
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);

	t.is(output, 'Hello World');
});

test('truncate text in the end', t => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate">Hello World</Text>
		</Box>,
	);

	t.is(output, 'Hello …');
});

test('truncate text in the middle', t => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate-middle">Hello World</Text>
		</Box>,
	);

	t.is(output, 'Hel…rld');
});

test('truncate text in the beginning', t => {
	const output = renderToString(
		<Box width={7}>
			<Text wrap="truncate-start">Hello World</Text>
		</Box>,
	);

	t.is(output, '… World');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('do not wrap text with BEL-terminated OSC hyperlinks', t => {
	// "Click here" is 10 chars, box is 20 wide - should not wrap
	const hyperlink =
		'\u001B]8;;https://example.com\u0007Click here\u001B]8;;\u0007';
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.is(stripAnsi(output), 'Click here');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('do not wrap text with ST-terminated OSC hyperlinks', t => {
	const hyperlink =
		'\u001B]8;;https://example.com\u001B\\Click here\u001B]8;;\u001B\\';
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.is(stripAnsi(output), 'Click here');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('do not wrap text with non-hyperlink OSC sequences', t => {
	// Title-setting OSC followed by visible text
	const text = '\u001B]0;My Title\u0007Some text';
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">{text}</Text>
		</Box>,
	);

	t.is(stripAnsi(output), 'Some text');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('hard-wrap single-word BEL-terminated OSC hyperlink', t => {
	// "abcdefghij" is 10 chars, box is 5 wide - forces wrapWord codepath
	const hyperlink =
		'\u001B]8;;https://example.com\u0007abcdefghij\u001B]8;;\u0007';
	const output = renderToString(
		<Box width={5}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.is(stripAnsi(output), 'abcde\nfghij');
});

// See https://github.com/vadimdemedes/ink/issues/633
test('hard-wrap single-word ST-terminated OSC hyperlink', t => {
	const hyperlink =
		'\u001B]8;;https://example.com\u001B\\abcdefghij\u001B]8;;\u001B\\';
	const output = renderToString(
		<Box width={5}>
			<Text wrap="wrap">{hyperlink}</Text>
		</Box>,
	);

	t.is(stripAnsi(output), 'abcde\nfghij');
});

test('ignore empty text node', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box>
				<Text>Hello World</Text>
			</Box>
			<Text>{''}</Text>
		</Box>,
	);

	t.is(output, 'Hello World');
});

test('render a single empty text node', t => {
	const output = renderToString(<Text>{''}</Text>);
	t.is(output, '');
});

test('number', t => {
	const output = renderToString(<Text>{1}</Text>);

	t.is(output, '1');
});

test('fail when text nodes are not within <Text> component', t => {
	let error: Error | undefined;

	class ErrorBoundary extends Component<{children?: React.ReactNode}> {
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		override render() {
			return this.props.children;
		}

		override componentDidCatch(reactError: Error) {
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

	t.truthy(error);
	t.is(
		error?.message,
		'Text string "Hello" must be rendered inside <Text> component',
	);
});

test('fail when text node is not within <Text> component', t => {
	let error: Error | undefined;

	class ErrorBoundary extends Component<{children?: React.ReactNode}> {
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		override render() {
			return this.props.children;
		}

		override componentDidCatch(reactError: Error) {
			error = reactError;
		}
	}

	renderToString(
		<ErrorBoundary>
			<Box>Hello World</Box>
		</ErrorBoundary>,
	);

	t.truthy(error);
	t.is(
		error?.message,
		'Text string "Hello World" must be rendered inside <Text> component',
	);
});

test('fail when <Box> is inside <Text> component', t => {
	let error: Error | undefined;

	class ErrorBoundary extends Component<{children?: React.ReactNode}> {
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		override render() {
			return this.props.children;
		}

		override componentDidCatch(reactError: Error) {
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

	t.truthy(error);
	t.is((error as any).message, '<Box> can’t be nested inside <Text> component');
});

test('remeasure text dimensions on text change', t => {
	const stdout = createStdout();

	const {rerender} = render(
		<Box>
			<Text>Hello</Text>
		</Box>,
		{stdout, debug: true},
	);

	t.is((stdout.write as any).lastCall.args[0], 'Hello');

	rerender(
		<Box>
			<Text>Hello World</Text>
		</Box>,
	);

	t.is((stdout.write as any).lastCall.args[0], 'Hello World');
});

test('fragment', t => {
	const output = renderToString(
		// eslint-disable-next-line react/jsx-no-useless-fragment
		<>
			<Text>Hello World</Text>
		</>,
	);

	t.is(output, 'Hello World');
});

test('transform children', t => {
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

	t.is(output, '[0: {0: test}]');
});

test('squash multiple text nodes', t => {
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

	t.is(output, '[0: {0: hello world}]');
});

test('transform with multiple lines', t => {
	const output = renderToString(
		<Transform
			transform={(string: string, index: number) => `[${index}: ${string}]`}
		>
			{/* prettier-ignore */}
			<Text>hello{' '}world{'\n'}goodbye{' '}world</Text>
		</Transform>,
	);

	t.is(output, '[0: hello world]\n[1: goodbye world]');
});

test('squash multiple nested text nodes', t => {
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

	t.is(output, '[0: {0: hello world}]');
});

test('squash empty `<Text>` nodes', t => {
	const output = renderToString(
		<Transform transform={(string: string) => `[${string}]`}>
			<Text>
				<Transform transform={(string: string) => `{${string}}`}>
					<Text>{[]}</Text>
				</Transform>
			</Text>
		</Transform>,
	);

	t.is(output, '');
});

test('<Transform> with undefined children', t => {
	const output = renderToString(<Transform transform={children => children} />);
	t.is(output, '');
});

test('<Transform> with null children', t => {
	const output = renderToString(<Transform transform={children => children} />);
	t.is(output, '');
});

test('hooks', t => {
	function WithHooks() {
		const [value, setValue] = useState('Hello');

		return <Text>{value}</Text>;
	}

	const output = renderToString(<WithHooks />);
	t.is(output, 'Hello');
});

test('static output', t => {
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

	t.is(output, 'A\nB\nC\n\n\nX');
});

test('skip previous output when rendering new static output', t => {
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

	t.is((stdout.write as any).lastCall.args[0], 'A\n');

	rerender(<Dynamic items={['A', 'B']} />);
	t.is((stdout.write as any).lastCall.args[0], 'A\nB\n');
});

test('render only new items in static output on final render', t => {
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

	t.is((stdout.write as any).lastCall.args[0], '');

	rerender(<Dynamic items={['A']} />);
	t.is((stdout.write as any).lastCall.args[0], 'A\n');

	rerender(<Dynamic items={['A', 'B']} />);
	unmount();

	// Filter out cursor management escapes (show/hide) to check content writes.
	// With isTTY=true, cli-cursor writes a show-cursor sequence on unmount.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const allWrites: string[] = (stdout.write as any).args.map(
		(args: string[]) => args[0]!,
	);
	const lastContentWrite = allWrites.findLast(w => !w.startsWith('\u001B[?25'));
	t.is(lastContentWrite, 'A\nB\n');
});

// See https://github.com/chalk/wrap-ansi/issues/27
test('ensure wrap-ansi doesn’t trim leading whitespace', t => {
	const output = renderToString(<Text color="red">{' ERROR '}</Text>);

	t.is(output, chalk.red(' ERROR '));
});

test('replace child node with text', t => {
	const stdout = createStdout();

	function Dynamic({replace}: {readonly replace?: boolean}) {
		return <Text>{replace ? 'x' : <Text color="green">test</Text>}</Text>;
	}

	const {rerender} = render(<Dynamic />, {
		stdout,
		debug: true,
	});

	t.is((stdout.write as any).lastCall.args[0], chalk.green('test'));

	rerender(<Dynamic replace />);
	t.is((stdout.write as any).lastCall.args[0], 'x');
});

// See https://github.com/vadimdemedes/ink/issues/145
test('disable raw mode when all input components are unmounted', t => {
	const stdout = createStdout();

	const stdin = new EventEmitter() as NodeJS.WriteStream;
	stdin.setEncoding = () => {};
	stdin.setRawMode = spy();
	stdin.isTTY = true; // Without this, setRawMode will throw
	stdin.ref = spy();
	stdin.unref = spy();

	const options = {
		stdout,
		stdin,
		debug: true,
	};

	class Input extends React.Component<{setRawMode: (mode: boolean) => void}> {
		override render() {
			return <Text>Test</Text>;
		}

		override componentDidMount() {
			this.props.setRawMode(true);
		}

		override componentWillUnmount() {
			this.props.setRawMode(false);
		}
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
				{renderFirstInput && <Input setRawMode={setRawMode} />}
				{renderSecondInput && <Input setRawMode={setRawMode} />}
			</>
		);
	}

	const {rerender} = render(
		<Test renderFirstInput renderSecondInput />,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		options as any,
	);

	t.true(stdin.setRawMode.calledOnce);
	t.true(stdin.ref.calledOnce);
	t.deepEqual(stdin.setRawMode.firstCall.args, [true]);

	rerender(<Test renderFirstInput />);

	t.true(stdin.setRawMode.calledOnce);
	t.true(stdin.ref.calledOnce);
	t.true(stdin.unref.notCalled);

	rerender(<Test />);

	t.true(stdin.setRawMode.calledTwice);
	t.true(stdin.ref.calledOnce);
	t.true(stdin.unref.calledOnce);
	t.deepEqual(stdin.setRawMode.lastCall.args, [false]);
});

test('re-ref stdin when input is used after previous unmount', t => {
	const stdin = new EventEmitter() as NodeJS.WriteStream;
	stdin.setEncoding = () => {};
	stdin.read = stub();
	stdin.setRawMode = spy();
	stdin.isTTY = true; // Without this, setRawMode will throw
	stdin.ref = spy();
	stdin.unref = spy();

	const options = {
		stdout: createStdout(),
		stdin,
		debug: true,
	};

	class Input extends React.Component<{setRawMode: (mode: boolean) => void}> {
		override render() {
			return <Text>Test</Text>;
		}

		override componentDidMount() {
			this.props.setRawMode(true);
		}

		override componentWillUnmount() {
			this.props.setRawMode(false);
		}
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
	const {unmount} = render(
		<Test onInput={onFirstMountInput} />,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		options as any,
	);

	t.true(stdin.ref.calledOnce);
	t.true(stdin.setRawMode.calledOnce);
	t.deepEqual(stdin.setRawMode.firstCall.args, [true]);
	emitReadable(stdin, 'a');
	t.is(onFirstMountInput.callCount, 1);
	t.deepEqual(onFirstMountInput.firstCall.args, ['a']);

	// Unmount first instance
	unmount();

	t.true(stdin.unref.calledOnce);
	t.true(stdin.setRawMode.calledTwice);
	t.deepEqual(stdin.setRawMode.lastCall.args, [false]);

	// Second render with new Ink instance reusing the same stdin
	const {unmount: unmount2} = render(
		<Test onInput={onSecondMountInput} />,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		options as any,
	);

	t.true(stdin.ref.calledTwice);
	t.true(stdin.setRawMode.calledThrice);
	t.deepEqual(stdin.setRawMode.lastCall.args, [true]);
	emitReadable(stdin, 'b');
	t.is(onSecondMountInput.callCount, 1);
	t.deepEqual(onSecondMountInput.firstCall.args, ['b']);
	t.is(onFirstMountInput.callCount, 1);

	// Unmount second instance
	unmount2();

	t.true(stdin.unref.calledTwice);
	t.is(stdin.setRawMode.callCount, 4);
	t.deepEqual(stdin.setRawMode.lastCall.args, [false]);
});

test('setRawMode() should throw if raw mode is not supported', t => {
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

	class Input extends React.Component<{setRawMode: (mode: boolean) => void}> {
		override render() {
			return <Text>Test</Text>;
		}

		override componentDidMount() {
			try {
				this.props.setRawMode(true);
			} catch (error: unknown) {
				didCatchInMount(error);
			}
		}

		override componentWillUnmount() {
			try {
				this.props.setRawMode(false);
			} catch (error: unknown) {
				didCatchInUnmount(error);
			}
		}
	}

	function Test() {
		const {setRawMode} = useStdin();
		return <Input setRawMode={setRawMode} />;
	}

	const {unmount} = render(<Test />, options);
	unmount();

	t.is(didCatchInMount.callCount, 1);
	t.is(didCatchInUnmount.callCount, 1);
	t.false(stdin.setRawMode.called);
});

test('render different component based on whether stdin is a TTY or not', t => {
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

	class Input extends React.Component<{setRawMode: (mode: boolean) => void}> {
		override render() {
			return <Text>Test</Text>;
		}

		override componentDidMount() {
			this.props.setRawMode(true);
		}

		override componentWillUnmount() {
			this.props.setRawMode(false);
		}
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
				{isRawModeSupported && renderFirstInput && (
					<Input setRawMode={setRawMode} />
				)}
				{isRawModeSupported && renderSecondInput && (
					<Input setRawMode={setRawMode} />
				)}
			</>
		);
	}

	const {rerender} = render(
		<Test renderFirstInput renderSecondInput />,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		options as any,
	);

	t.false(stdin.setRawMode.called);

	rerender(<Test renderFirstInput />);

	t.false(stdin.setRawMode.called);

	rerender(<Test />);

	t.false(stdin.setRawMode.called);
});

test('render only last frame when run in CI', async t => {
	const output = await run('ci', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true'},
		columns: 0,
	});

	for (const num of [0, 1, 2, 3, 4]) {
		t.false(output.includes(`Counter: ${num}`));
	}

	t.true(output.includes('Counter: 5'));
});

test('render all frames if CI environment variable equals false', async t => {
	const output = await run('ci', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'false'},
		columns: 0,
	});

	for (const num of [0, 1, 2, 3, 4, 5]) {
		t.true(output.includes(`Counter: ${num}`));
	}
});

test('debug mode in CI does not replay final frame during unmount teardown', async t => {
	const output = await run('ci-debug', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true'},
		columns: 0,
	});

	const plainOutput = stripAnsi(output).replaceAll('\r', '');
	const helloCount = plainOutput.match(/Hello/g)?.length ?? 0;

	t.is(helloCount, 2);
});

test('debug mode in CI keeps final newline separation after waitUntilExit', async t => {
	const output = await run('ci-debug-after-exit', {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		env: {CI: 'true'},
		columns: 0,
	});

	const plainOutput = stripAnsi(output).replaceAll('\r', '');
	t.is(plainOutput, 'HelloHello\nDONE');
});

test('render only last frame when stdout is not a TTY', async t => {
	const stdout = createStdout(100, false);

	function Counter() {
		const [count, setCount] = useState(0);

		React.useEffect(() => {
			if (count < 3) {
				const timer = setTimeout(() => {
					setCount(c => c + 1);
				}, 10);

				return () => {
					clearTimeout(timer);
				};
			}
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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const allWrites: string[] = (stdout.write as any).args.map(
		(args: string[]) => args[0]!,
	);

	// Verify no intermediate frames were written
	const contentWrites = allWrites.map(w => stripAnsi(w));
	for (const intermediate of ['Count: 0', 'Count: 1', 'Count: 2']) {
		t.false(
			contentWrites.some(w => w.includes(intermediate)),
			`Intermediate frame "${intermediate}" should not be written in non-interactive mode`,
		);
	}

	// Verify no erase/cursor ANSI sequences were emitted
	const hasEraseSequence = allWrites.some(w =>
		w.includes(ansiEscapes.eraseLines(1)),
	);
	t.false(hasEraseSequence);

	// Verify the final frame is written
	const lastWrite = allWrites.at(-1) ?? '';
	t.true(lastWrite.includes('Count: 3'));
});

test('render all frames when nonInteractive is explicitly false', async t => {
	const stdout = createStdout(100, false);

	function Counter() {
		const [count, setCount] = useState(0);

		React.useEffect(() => {
			if (count < 2) {
				const timer = setTimeout(() => {
					setCount(c => c + 1);
				}, 50);

				return () => {
					clearTimeout(timer);
				};
			}
		}, [count]);

		return <Text>Count: {count}</Text>;
	}

	const {unmount, waitUntilExit} = render(<Counter />, {
		stdout,
		debug: false,
		nonInteractive: false,
	});

	await new Promise(resolve => {
		setTimeout(resolve, 500);
	});

	unmount();
	await waitUntilExit();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const contentWrites: string[] = (stdout.write as any).args
		.map((args: string[]) => args[0]!)
		.filter((w: string) => w.length > 0);
	t.true(contentWrites.length > 1);
	const joined = contentWrites.join('');
	t.true(joined.includes('Count: 0'));
	t.true(joined.includes('Count: 1'));
	t.true(joined.includes('Count: 2'));
});

test('nonInteractive option overrides TTY detection', async t => {
	const stdout = createStdout(100, true);

	function Counter() {
		const [count, setCount] = useState(0);

		React.useEffect(() => {
			if (count < 3) {
				const timer = setTimeout(() => {
					setCount(c => c + 1);
				}, 10);

				return () => {
					clearTimeout(timer);
				};
			}
		}, [count]);

		return <Text>Count: {count}</Text>;
	}

	const {unmount, waitUntilExit} = render(<Counter />, {
		stdout,
		debug: false,
		nonInteractive: true,
	});

	await new Promise(resolve => {
		setTimeout(resolve, 200);
	});

	unmount();
	await waitUntilExit();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const allWrites: string[] = (stdout.write as any).args.map(
		(args: string[]) => args[0]!,
	);

	// Verify no intermediate frames were written
	const contentWrites = allWrites.map(w => stripAnsi(w));
	for (const intermediate of ['Count: 0', 'Count: 1', 'Count: 2']) {
		t.false(
			contentWrites.some(w => w.includes(intermediate)),
			`Intermediate frame "${intermediate}" should not be written when nonInteractive overrides TTY`,
		);
	}

	// Verify no erase/cursor ANSI sequences were emitted
	const hasEraseSequence = allWrites.some((w: string) =>
		w.includes(ansiEscapes.eraseLines(1)),
	);
	t.false(hasEraseSequence);

	// Verify only the final frame is written
	const lastWrite = allWrites.at(-1) ?? '';
	t.true(lastWrite.includes('Count: 3'));
});

test('static output is written immediately in non-interactive mode', async t => {
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

	unmount();
	await waitUntilExit();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const allWrites: string[] = (stdout.write as any).args.map(
		(args: string[]) => args[0]!,
	);

	// Verify write ordering: static items must appear before the final dynamic write
	const writeContents = allWrites.map(w => stripAnsi(w));
	const indexOfA = writeContents.findIndex(w => w.includes('A'));
	const indexOfB = writeContents.findIndex(w => w.includes('B'));
	const indexOfDynamic = writeContents.findIndex(w => w.includes('Dynamic'));

	t.true(indexOfA >= 0, 'Static item A was written');
	t.true(indexOfB >= 0, 'Static item B was written');
	t.true(indexOfDynamic >= 0, 'Dynamic content was written');
	t.true(
		indexOfA < indexOfDynamic,
		'Static A was written before final dynamic output',
	);
	t.true(
		indexOfB < indexOfDynamic,
		'Static B was written before final dynamic output',
	);
});

test('reset prop when it’s removed from the element', t => {
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

	t.is((stdout.write as any).lastCall.args[0], '\n\n\nx');

	rerender(<Dynamic remove />);
	t.is((stdout.write as any).lastCall.args[0], 'x');
});

test('newline', t => {
	const output = renderToString(
		<Text>
			Hello
			<Newline />
			World
		</Text>,
	);
	t.is(output, 'Hello\nWorld');
});

test('multiple newlines', t => {
	const output = renderToString(
		<Text>
			Hello
			<Newline count={2} />
			World
		</Text>,
	);
	t.is(output, 'Hello\n\nWorld');
});

test('horizontal spacer', t => {
	const output = renderToString(
		<Box width={20}>
			<Text>Left</Text>
			<Spacer />
			<Text>Right</Text>
		</Box>,
	);

	t.is(output, 'Left           Right');
});

test('vertical spacer', t => {
	const output = renderToString(
		<Box flexDirection="column" height={6}>
			<Text>Top</Text>
			<Spacer />
			<Text>Bottom</Text>
		</Box>,
	);

	t.is(output, 'Top\n\n\n\n\nBottom');
});

test('link ansi escapes are closed properly', t => {
	const output = renderToString(
		<Text>{ansiEscapes.link('Example', 'https://example.com')}</Text>,
	);

	t.is(output, ']8;;https://example.comExample]8;;');
});

// Concurrent mode tests
test('text - concurrent', async t => {
	const output = await renderToStringAsync(<Text>Hello World</Text>);
	t.is(output, 'Hello World');
});

test('multiple text nodes - concurrent', async t => {
	const output = await renderToStringAsync(
		<Text>
			{'Hello'}
			{' World'}
		</Text>,
	);
	t.is(output, 'Hello World');
});

test('wrap text - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box width={7}>
			<Text wrap="wrap">Hello World</Text>
		</Box>,
	);
	t.is(output, 'Hello\nWorld');
});

test('truncate text in the end - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box width={7}>
			<Text wrap="truncate">Hello World</Text>
		</Box>,
	);
	t.is(output, 'Hello …');
});

test('transform children - concurrent', async t => {
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
	t.is(output, '[0: {0: test}]');
});

test('static output - concurrent', async t => {
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
	t.is(output, 'A\nB\nC\n\n\nX');
});

test('remeasure text dimensions on text change - concurrent', async t => {
	const {getOutput, rerenderAsync} = await renderAsync(
		<Box>
			<Text>Hello</Text>
		</Box>,
	);
	t.is(getOutput(), 'Hello');

	await rerenderAsync(
		<Box>
			<Text>Hello World</Text>
		</Box>,
	);
	t.is(getOutput(), 'Hello World');
});

test('newline - concurrent', async t => {
	const output = await renderToStringAsync(
		<Text>
			Hello
			<Newline />
			World
		</Text>,
	);
	t.is(output, 'Hello\nWorld');
});

test('horizontal spacer - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box width={20}>
			<Text>Left</Text>
			<Spacer />
			<Text>Right</Text>
		</Box>,
	);
	t.is(output, 'Left           Right');
});

test('vertical spacer - concurrent', async t => {
	const output = await renderToStringAsync(
		<Box flexDirection="column" height={6}>
			<Text>Top</Text>
			<Spacer />
			<Text>Bottom</Text>
		</Box>,
	);
	t.is(output, 'Top\n\n\n\n\nBottom');
});
