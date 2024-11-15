import React, {Suspense} from 'react';
import test from 'ava';
import chalk from 'chalk';
import {Box, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('update child', t => {
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

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>B</Text>);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('update text node', t => {
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

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>Hello B</Text>);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('append child', t => {
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

	t.is(
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

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('insert child between other children', t => {
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

	t.is(
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

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('remove child', t => {
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

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);

	actual.rerender(<Test remove />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
		</Box>,
	);

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
});

test('reorder children', t => {
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

	t.is(
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

	t.is(
		(stdoutActual.write as any).lastCall.args[0],
		(stdoutExpected.write as any).lastCall.args[0],
	);
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

test('support suspense', async t => {
	const stdout = createStdout();

	let promise: Promise<void> | undefined;
	let state: 'pending' | 'done' | undefined;
	let value: string | undefined;

	const read = () => {
		if (!promise) {
			promise = new Promise(resolve => {
				setTimeout(resolve, 500);
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

	t.is((stdout.write as any).lastCall.args[0], 'Loading');

	await promise;
	out.rerender(<Test />);

	t.is((stdout.write as any).lastCall.args[0], 'Hello World');
});
