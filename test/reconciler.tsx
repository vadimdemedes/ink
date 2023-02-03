import React, {Suspense} from 'react';
import test from 'ava';
import chalk from 'chalk';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('update child', t => {
	const Test = ({update}: {update: boolean}) => <Text>{update ? 'B' : 'A'}</Text>;

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	// @ts-ignore
	const actual = render(<Test />, {
		stdout: stdoutActual as any as any,
		debug: true
	});

	const expected = render(<Text>A</Text>, {
		stdout: stdoutExpected as any as any,
		debug: true
	});

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>B</Text>);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);
});

test('update text node', t => {
	const Test = ({update}: {update: any}) => (
		<Box>
			<Text>Hello </Text>
			<Text>{update ? 'B' : 'A'}</Text>
		</Box>
	);

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	// @ts-ignore
	const actual = render(<Test />, {
		stdout: stdoutActual as any,
		debug: true
	});

	const expected = render(<Text>Hello A</Text>, {
		stdout: stdoutExpected as any,
		debug: true
	});

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>Hello B</Text>);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);
});

test('append child', t => {
	const Test = ({append}: {append: any}) => {
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
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	// @ts-ignore
	const actual = render(<Test />, {
		stdout: stdoutActual as any,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
		</Box>,
		{
			stdout: stdoutExpected as any,
			debug: true
		}
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);

	actual.rerender(<Test append />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);
});

test('insert child between other children', t => {
	const Test = ({insert}: {insert: any}) => {
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
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	// @ts-ignore
	const actual = render(<Test />, {
		stdout: stdoutActual as any,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>C</Text>
		</Box>,
		{
			stdout: stdoutExpected as any,
			debug: true
		}
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);

	actual.rerender(<Test insert />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
			<Text>C</Text>
		</Box>
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);
});

test('remove child', t => {
	const Test = ({remove}: {remove: any}) => {
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
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	// @ts-ignore
	const actual = render(<Test />, {
		stdout: stdoutActual as any,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{
			stdout: stdoutExpected as any,
			debug: true
		}
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);

	actual.rerender(<Test remove />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
		</Box>
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);
});

test('reorder children', t => {
	const Test = ({reorder}: {reorder: any}) => {
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
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	// @ts-ignore
	const actual = render(<Test />, {
		stdout: stdoutActual as any,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{
			stdout: stdoutExpected as any,
			debug: true
		}
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);

	actual.rerender(<Test reorder />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>B</Text>
			<Text>A</Text>
		</Box>
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0]
	);
});

test('replace child node with text', t => {
	const stdout = createStdout();

	const Dynamic = ({replace}: {replace?: boolean}) => (
		<Text>{replace ? 'x' : <Text color="green">test</Text>}</Text>
	);

	const {rerender} = render(<Dynamic />, {
		stdout: stdout as any,
		debug: true
	});

	t.is((stdout.write as any).lastCall.args[0], chalk.green('test'));

	rerender(<Dynamic replace />);
	t.is((stdout.write as any).lastCall.args[0], 'x');
});

test('support suspense', async t => {
	const stdout = createStdout();

	let promise: any;
	let state: any;
	let value: any;

	const read = () => {
		if (!promise) {
			promise = new Promise(resolve => {
				setTimeout(resolve, 500);
			});

			state = 'pending';

			// eslint-disable-next-line promise/prefer-await-to-then
			promise.then(() => {
				state = 'done';
				value = 'Hello World';
			});
		}

		if (state === 'pending') {
			throw promise;
		}

		if (state === 'done') {
			return value;
		}
	};

	const Suspendable = () => <Text>{read()}</Text>;

	const Test = () => (
		<Suspense fallback={<Text>Loading</Text>}>
			<Suspendable />
		</Suspense>
	);

	const out = render(<Test />, {
		stdout: stdout as any,
		debug: true
	});

	t.is((stdout.write as any).lastCall.args[0], 'Loading');

	// eslint-disable-next-line @typescript-eslint/await-thenable
	await promise;
	out.rerender(<Test />);

	t.is((stdout.write as any).lastCall.args[0], 'Hello World');
});
