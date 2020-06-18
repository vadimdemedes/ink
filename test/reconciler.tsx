import React, {Suspense} from 'react';
import test from 'ava';
import chalk from 'chalk';
import {Box, Text, render} from '../src';
import createStdout from './helpers/create-stdout';

test('update child', t => {
	const Test = ({update}) => <Text>{update ? 'B' : 'A'}</Text>;

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true
	});

	const expected = render(<Text>A</Text>, {
		stdout: stdoutExpected,
		debug: true
	});

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>B</Text>);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);
});

test('update text node', t => {
	const Test = ({update}) => (
		<Box>
			<Text>Hello </Text>
			<Text>{update ? 'B' : 'A'}</Text>
		</Box>
	);

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true
	});

	const expected = render(<Text>Hello A</Text>, {
		stdout: stdoutExpected,
		debug: true
	});

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);

	actual.rerender(<Test update />);
	expected.rerender(<Text>Hello B</Text>);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);
});

test('append child', t => {
	const Test = ({append}) => {
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

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true
		}
	);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);

	actual.rerender(<Test append />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>
	);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);
});

test('insert child between other children', t => {
	const Test = ({insert}) => {
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

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>C</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true
		}
	);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
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
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);
});

test('remove child', t => {
	const Test = ({remove}) => {
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

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true
		}
	);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);

	actual.rerender(<Test remove />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>A</Text>
		</Box>
	);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);
});

test('reorder children', t => {
	const Test = ({reorder}) => {
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

	const actual = render(<Test />, {
		stdout: stdoutActual,
		debug: true
	});

	const expected = render(
		<Box flexDirection="column">
			<Text>A</Text>
			<Text>B</Text>
		</Box>,
		{
			stdout: stdoutExpected,
			debug: true
		}
	);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);

	actual.rerender(<Test reorder />);

	expected.rerender(
		<Box flexDirection="column">
			<Text>B</Text>
			<Text>A</Text>
		</Box>
	);

	t.is(
		stdoutActual.write.lastCall.args[0],
		stdoutExpected.write.lastCall.args[0]
	);
});

test('replace child node with text', t => {
	const stdout = createStdout();

	const Dynamic = ({replace}) => (
		<Text>{replace ? 'x' : <Text color="green">test</Text>}</Text>
	);

	const {rerender} = render(<Dynamic />, {
		stdout,
		debug: true
	});

	t.is(stdout.write.lastCall.args[0], chalk.green('test'));

	rerender(<Dynamic replace />);
	t.is(stdout.write.lastCall.args[0], 'x');
});

test('support suspense', async t => {
	const stdout = createStdout();

	let promise;
	let state;
	let value;

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
		stdout,
		debug: true
	});

	t.is(stdout.write.lastCall.args[0], 'Loading');

	// eslint-disable-next-line @typescript-eslint/await-thenable
	await promise;
	out.rerender(<Test />);

	t.is(stdout.write.lastCall.args[0], 'Hello World');
});
