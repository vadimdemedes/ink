/* eslint-disable react/prop-types */
import React from 'react';
import test from 'ava';
import chalk from 'chalk';
import {spy} from 'sinon';
import {Box, Color, render} from '..';

const isExperimental = process.env.EXPERIMENTAL === 'true';

const createStdout = () => ({
	write: spy(),
	columns: 100
});

test('update child', t => {
	const Test = ({update}) => <Box>{update ? 'B' : 'A'}</Box>;

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test/>, {
		stdout: stdoutActual,
		debug: true,
		experimental: isExperimental
	});

	const expected = render(<Box>A</Box>, {
		stdout: stdoutExpected,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);

	actual.rerender(<Test update/>);
	expected.rerender(<Box>B</Box>);

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);
});

test('update text node', t => {
	const Test = ({update}) => <Box>{'Hello '}{update ? 'B' : 'A'}</Box>;

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test/>, {
		stdout: stdoutActual,
		debug: true,
		experimental: isExperimental
	});

	const expected = render(<Box>Hello A</Box>, {
		stdout: stdoutExpected,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);

	actual.rerender(<Test update/>);
	expected.rerender(<Box>Hello B</Box>);

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);
});

test('append child', t => {
	const Test = ({append}) => {
		if (append) {
			return (
				<Box flexDirection="column">
					<Box>A</Box>
					<Box>B</Box>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Box>A</Box>
			</Box>
		);
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test/>, {
		stdout: stdoutActual,
		debug: true,
		experimental: isExperimental
	});

	const expected = render((
		<Box flexDirection="column">
			<Box>A</Box>
		</Box>
	), {
		stdout: stdoutExpected,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);

	actual.rerender(<Test append/>);

	expected.rerender((
		<Box flexDirection="column">
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	));

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);
});

test('insert child between other children', t => {
	const Test = ({insert}) => {
		if (insert) {
			return (
				<Box flexDirection="column">
					<Box key="a">A</Box>
					<Box key="b">B</Box>
					<Box key="c">C</Box>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Box key="a">A</Box>
				<Box key="c">C</Box>
			</Box>
		);
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test/>, {
		stdout: stdoutActual,
		debug: true,
		experimental: isExperimental
	});

	const expected = render((
		<Box flexDirection="column">
			<Box>A</Box>
			<Box>C</Box>
		</Box>
	), {
		stdout: stdoutExpected,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);

	actual.rerender(<Test insert/>);

	expected.rerender((
		<Box flexDirection="column">
			<Box>A</Box>
			<Box>B</Box>
			<Box>C</Box>
		</Box>
	));

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);
});

test('remove child', t => {
	const Test = ({remove}) => {
		if (remove) {
			return (
				<Box flexDirection="column">
					<Box>A</Box>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Box>A</Box>
				<Box>B</Box>
			</Box>
		);
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test/>, {
		stdout: stdoutActual,
		debug: true,
		experimental: isExperimental
	});

	const expected = render((
		<Box flexDirection="column">
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	), {
		stdout: stdoutExpected,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);

	actual.rerender(<Test remove/>);

	expected.rerender((
		<Box flexDirection="column">
			<Box>A</Box>
		</Box>
	));

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);
});

test('reorder children', t => {
	const Test = ({reorder}) => {
		if (reorder) {
			return (
				<Box flexDirection="column">
					<Box key="b">B</Box>
					<Box key="a">A</Box>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Box key="a">A</Box>
				<Box key="b">B</Box>
			</Box>
		);
	};

	const stdoutActual = createStdout();
	const stdoutExpected = createStdout();

	const actual = render(<Test/>, {
		stdout: stdoutActual,
		debug: true,
		experimental: isExperimental
	});

	const expected = render((
		<Box flexDirection="column">
			<Box>A</Box>
			<Box>B</Box>
		</Box>
	), {
		stdout: stdoutExpected,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);

	actual.rerender(<Test reorder/>);

	expected.rerender((
		<Box flexDirection="column">
			<Box>B</Box>
			<Box>A</Box>
		</Box>
	));

	t.is(stdoutActual.write.lastCall.args[0], stdoutExpected.write.lastCall.args[0]);
});

test('replace child node with text', t => {
	const stdout = createStdout();

	const Dynamic = ({replace}) => (
		<Box>
			{replace ? 'x' : <Color green>test</Color>}
		</Box>
	);

	const {rerender} = render(<Dynamic/>, {
		stdout,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdout.write.lastCall.args[0], chalk.green('test'));

	rerender(<Dynamic replace/>);
	t.is(stdout.write.lastCall.args[0], 'x');
});
