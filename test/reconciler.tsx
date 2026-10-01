import test, {type TestContext} from 'node:test';
import React, {Suspense, startTransition} from 'react';
import chalk from 'chalk';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {renderAsync} from './helpers/test-renderer.js';
import {act} from './helpers/act.js';

test('fragment refs remain unsupported while their children render and update', async (t: TestContext) => {
	const ref = React.createRef<React.FragmentInstance>();
	const frame = (text: string) => (
		// The fragment ref is the subject of this test.
		<React.Fragment ref={ref}>
			<Text>{text}</Text>
		</React.Fragment>
	);
	const {getOutput, rerenderAsync, unmount} = await renderAsync(frame('first'));
	t.after(() => {
		unmount();
	});
	t.assert.strictEqual(getOutput(), 'first');
	t.assert.strictEqual(ref.current, null);
	await rerenderAsync(frame('second'));
	t.assert.strictEqual(getOutput(), 'second');
	t.assert.strictEqual(ref.current, null);
});

test('terminal host updates complete inside a transition', async (t: TestContext) => {
	const instance = await renderAsync(<Text>first</Text>);
	t.after(() => {
		instance.unmount();
	});
	await act(async () => {
		startTransition(() => {
			instance.rerender(<Text>second</Text>);
		});
	});
	t.assert.strictEqual(instance.getOutput(), 'second');
});

test('Suspense hides nested text while showing its fallback', async (t: TestContext) => {
	const {promise, resolve: resolvePromise} = Promise.withResolvers<void>();
	t.after(() => {
		resolvePromise();
	});

	function Suspendable({pending}: {readonly pending: boolean}) {
		if (pending) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw promise;
		}

		return <Text>Ready</Text>;
	}

	function Example({
		pending,
		showFallback = true,
	}: {
		readonly pending: boolean;
		readonly showFallback?: boolean;
	}) {
		return (
			<Box>
				<Text>
					Status:{' '}
					<Suspense fallback={showFallback ? <Text>Loading</Text> : null}>
						<Suspendable pending={pending} />
					</Suspense>
				</Text>
				<Text>!</Text>
			</Box>
		);
	}

	const {getOutput, rerenderAsync, unmount} = await renderAsync(
		<Example pending={false} />,
	);
	t.after(() => {
		unmount();
	});
	t.assert.strictEqual(getOutput(), 'Status: Ready!');

	await rerenderAsync(<Example pending />);
	t.assert.strictEqual(getOutput(), 'Status: Loading!');

	await rerenderAsync(<Example pending={false} />);
	t.assert.strictEqual(getOutput(), 'Status: Ready!');

	await rerenderAsync(<Example pending showFallback={false} />);
	t.assert.strictEqual(getOutput(), 'Status: !');

	await rerenderAsync(<Example pending={false} showFallback={false} />);
	t.assert.strictEqual(getOutput(), 'Status: Ready!');
});

test('resuming Suspense preserves display none', async (t: TestContext) => {
	const {promise, resolve: resolvePromise} = Promise.withResolvers<void>();
	t.after(() => {
		resolvePromise();
	});

	function Suspendable({pending}: {readonly pending: boolean}) {
		if (pending) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw promise;
		}

		return <Text>Visible</Text>;
	}

	function Test({pending}: {readonly pending: boolean}) {
		return (
			<Suspense fallback={<Text>Loading</Text>}>
				<Box display="none">
					<Text>Hidden</Text>
				</Box>
				<Suspendable pending={pending} />
			</Suspense>
		);
	}

	const {getOutput, rerenderAsync, unmount} = await renderAsync(
		<Test pending={false} />,
	);
	t.after(() => {
		unmount();
	});
	t.assert.strictEqual(getOutput(), 'Visible');

	await rerenderAsync(<Test pending />);
	t.assert.strictEqual(getOutput(), 'Loading');

	await rerenderAsync(<Test pending={false} />);
	t.assert.strictEqual(getOutput(), 'Visible');
});

test('update child', (t: TestContext) => {
	function Test({update}: {readonly update?: boolean}) {
		return <Text>{update ? 'B' : 'A'}</Text>;
	}

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true,
	});

	const expected = render(<Text>A</Text>, {
		stdout: stdoutExpected,
		debug: true,
	});

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>B</Text>);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('update text node', (t: TestContext) => {
	function Test({update}: {readonly update?: boolean}) {
		return (
			<Box>
				<Text>Hello </Text>
				<Text>{update ? 'B' : 'A'}</Text>
			</Box>
		);
	}

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true,
	});

	const expected = render(<Text>Hello A</Text>, {
		stdout: stdoutExpected,
		debug: true,
	});

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>Hello B</Text>);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('remove style prop from intrinsic node', (t: TestContext) => {
	function Test({withStyle}: {readonly withStyle: boolean}) {
		return (
			<ink-box style={withStyle ? {marginLeft: 1} : undefined}>
				<ink-text>X</ink-text>
			</ink-box>
		);
	}

	const stdout = createStdout();

	const {rerender} = render(<Test withStyle />, {
		stdout,
		debug: true,
	});

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], ' X');

	rerender(<Test withStyle={false} />);
	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'X');
});

test('append child', (t: TestContext) => {
	function Test({append}: {readonly append?: boolean}) {
		if (append) {
			return (
				<Box flexDirection="column">
					<Text>A</Text>
					<Text>B</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Text>A</Text>
			</Box>
		);
	}

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true,
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true,
		},
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test append />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('insert child between other children', (t: TestContext) => {
	function Test({insert}: {readonly insert?: boolean}) {
		if (insert) {
			return (
				<Box flexDirection="column">
					<Text key="a">A</Text>
					<Text key="b">B</Text>
					<Text key="c">C</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Text key="a">A</Text>
				<Text key="c">C</Text>
			</Box>
		);
	}

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true,
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>C</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true,
		},
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test insert />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>,
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('remove child', (t: TestContext) => {
	function Test({remove}: {readonly remove?: boolean}) {
		if (remove) {
			return (
				<Box flexDirection="column">
					<Text>A</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Text>A</Text>
				<Text>B</Text>
			</Box>
		);
	}

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true,
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true,
		},
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test remove />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
		</Box>,
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('reorder children', (t: TestContext) => {
	function Test({reorder}: {readonly reorder?: boolean}) {
		if (reorder) {
			return (
				<Box flexDirection="column">
					<Text key="b">B</Text>
					<Text key="a">A</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Text key="a">A</Text>
				<Text key="b">B</Text>
			</Box>
		);
	}

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true,
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true,
		},
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test reorder />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>B</Text>
			<Text>A</Text>
		</Box>,
	);

	t.assert.strictEqual(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
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

test('support suspense', async (t: TestContext) => {
	const stdout = createStdout();

	let promise: Promise<void> | undefined;
	let state: 'pending' | 'done' | undefined;
	let value: string | undefined;

	const read = () => {
		if (!promise) {
			promise = new Promise(resolve => {
				setTimeout(resolve, 100);
			});

			state = 'pending';

			(async () => {
				await promise;
				state = 'done';
				value = 'Hello World';
			})();
		}

		if (state === 'done') {
			return value;
		}

		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw promise;
	};

	function Suspendable() {
		return <Text>{read()}</Text>;
	}

	function Test() {
		return (
			<Suspense fallback={<Text>Loading</Text>}>
				<Suspendable />
			</Suspense>
		);
	}

	const out = render(<Test />, {
		stdout,
		debug: true,
	});

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Loading');

	await promise;
	out.rerender(<Test />);

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Hello World');
});

test('support suspense with concurrent mode', async (t: TestContext) => {
	const stdout = createStdout();

	const {promise, resolve: resolvePromise} = Promise.withResolvers<void>();

	// eslint-disable-next-line prefer-const
	let data: string | undefined;

	function Suspendable() {
		if (data === undefined) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw promise;
		}

		return <Text>{data}</Text>;
	}

	function Test() {
		return (
			<Suspense fallback={<Text>Loading</Text>}>
				<Suspendable />
			</Suspense>
		);
	}

	await act(async () => {
		render(<Test />, {
			stdout,
			debug: true,
			concurrent: true,
		});
	});

	t.assert.strictEqual((stdout.write as any).lastCall.args[0], 'Loading');

	// Resolve the suspense and wait for React to re-render
	data = 'Hello Concurrent World';
	await act(async () => {
		resolvePromise();
		await promise;
	});

	t.assert.strictEqual(
		(stdout.write as any).lastCall.args[0],
		'Hello Concurrent World',
	);
});
