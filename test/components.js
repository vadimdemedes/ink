/* eslint-disable react/prop-types */
import EventEmitter from 'events';
import React, {useState} from 'react';
import test from 'ava';
import chalk from 'chalk';
import {spy} from 'sinon';
import stripAnsi from 'strip-ansi';
import renderToString from './helpers/render-to-string';
import run from './helpers/run';
import {Box, Color, Text, Static, StdinContext, render} from '..';

const isExperimental = process.env.EXPERIMENTAL === 'true';

test('text', t => {
	const output = renderToString(<Box>Hello World</Box>);

	t.is(output, 'Hello World');
});

test('text with variable', t => {
	const output = renderToString(<Box>Count: {1}</Box>);

	t.is(output, 'Count: 1');
});

test('multiple text nodes', t => {
	const output = renderToString(
		<Box>
			{'Hello'}
			{' World'}
		</Box>
	);

	t.is(output, 'Hello World');
});

test('text with component', t => {
	const World = () => <Box>World</Box>;

	const output = renderToString(
		<Box>
			Hello <World/>
		</Box>
	);

	t.is(output, 'Hello World');
});

test('text with fragment', t => {
	const output = renderToString(
		<Box>
			Hello <>World</>
		</Box>
	);

	t.is(output, 'Hello World');
});

test('wrap text', t => {
	const output = renderToString((
		<Box textWrap="wrap">
			Hello World
		</Box>
	), {columns: 7});

	t.is(output, 'Hello\nWorld');
});

test('don\'t wrap text if there is enough space', t => {
	const output = renderToString((
		<Box textWrap="wrap">
			Hello World
		</Box>
	), {columns: 20});

	t.is(output, 'Hello World');
});

test('truncate text in the end', t => {
	const output = renderToString((
		<Box textWrap="truncate">
			Hello World
		</Box>
	), {columns: 7});

	t.is(output, 'Hello …');
});

test('truncate text in the middle', t => {
	const output = renderToString((
		<Box textWrap="truncate-middle">
			Hello World
		</Box>
	), {columns: 7});

	t.is(output, 'Hel…rld');
});

test('truncate text in the beginning', t => {
	const output = renderToString((
		<Box textWrap="truncate-start">
			Hello World
		</Box>
	), {columns: 7});

	t.is(output, '… World');
});

test('empty text node', t => {
	const output = renderToString((
		<Box flexDirection="column">
			<Box>Hello World</Box>
			{''}
		</Box>
	));

	t.is(output, 'Hello World');
});

test('number', t => {
	const output = renderToString(<Box>{1}</Box>);

	t.is(output, '1');
});

test('fragment', t => {
	const output = renderToString(<>Hello World</>);

	t.is(output, 'Hello World');
});

test('transform children', t => {
	const output = renderToString(
		<Box unstable__transformChildren={str => `[${str}]`}>
			<Box unstable__transformChildren={str => `{${str}}`}>test</Box>
		</Box>
	);

	t.is(output, '[{test}]');
});

test('squash multiple text nodes', t => {
	const output = renderToString(
		<Box unstable__transformChildren={str => `[${str}]`}>
			<Box unstable__transformChildren={str => `{${str}}`}>
				hello{' '}world
			</Box>
		</Box>
	);

	t.is(output, '[{hello world}]');
});

test('squash multiple nested text nodes', t => {
	const output = renderToString(
		<Box unstable__transformChildren={str => `[${str}]`}>
			<Box unstable__transformChildren={str => `{${str}}`}>
				hello
				<Text>{' '}world</Text>
			</Box>
		</Box>
	);

	t.is(output, '[{hello world}]');
});

test('hooks', t => {
	const WithHooks = () => {
		const [value] = useState('Hello');

		return (
			<Box>{value}</Box>
		);
	};

	const output = renderToString(<WithHooks/>);
	t.is(output, 'Hello');
});

test('static output', t => {
	const output = renderToString(
		<Box>
			<Static paddingBottom={1}>
				<Box key="a">A</Box>
				<Box key="b">B</Box>
				<Box key="c">C</Box>
			</Static>

			<Box marginTop={1}>
				X
			</Box>
		</Box>
	);

	t.is(output, 'A\nB\nC\n\n\nX');
});

test('skip previous output when rendering new static output', t => {
	const stdout = {
		write: spy(),
		columns: 100
	};

	const Dynamic = ({items}) => (
		<Static>
			{items.map(item => (
				<Box key={item}>{item}</Box>
			))}
		</Static>
	);

	const {rerender} = render(<Dynamic items={['A']}/>, {
		stdout,
		debug: true,
		experimental: isExperimental
	});

	t.is(stdout.write.lastCall.args[0], 'A\n');

	rerender(<Dynamic items={['A', 'B']}/>);
	t.is(stdout.write.lastCall.args[0], 'A\nB\n');
});

// See https://github.com/chalk/wrap-ansi/issues/27
test('ensure wrap-ansi doesn\'t trim leading whitespace', t => {
	const output = renderToString(
		<Color red>
			{' ERROR '}
		</Color>
	);

	t.is(output, chalk.red(' ERROR '));
});

test('ensure Color doesn\'t throw on empty children', t => {
	const output = renderToString(<Color/>);
	t.is(output, '');
});

test('replace child node with text', t => {
	const stdout = {
		write: spy(),
		columns: 100
	};

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

// See https://github.com/vadimdemedes/ink/issues/145
test('disable raw mode when all input components are unmounted', t => {
	const stdout = {
		write: spy(),
		columns: 100
	};

	const stdin = new EventEmitter();
	stdin.setEncoding = () => {};
	stdin.setRawMode = spy();
	stdin.isTTY = true; // Without this, setRawMode will throw
	stdin.resume = spy();
	stdin.pause = spy();

	const options = {
		stdout,
		stdin,
		debug: true,
		experimental: isExperimental
	};

	class Input extends React.Component {
		render() {
			return <Box>Test</Box>;
		}

		componentDidMount() {
			this.props.setRawMode(true);
		}

		componentWillUnmount() {
			this.props.setRawMode(false);
		}
	}

	const Test = ({renderFirstInput, renderSecondInput}) => (
		<StdinContext.Consumer>
			{({setRawMode}) => (
				<>
					{renderFirstInput && <Input setRawMode={setRawMode}/>}
					{renderSecondInput && <Input setRawMode={setRawMode}/>}
				</>
			)}
		</StdinContext.Consumer>
	);

	const {rerender} = render(<Test renderFirstInput renderSecondInput/>, options);

	t.true(stdin.setRawMode.calledOnce);
	t.deepEqual(stdin.setRawMode.firstCall.args, [true]);
	t.true(stdin.resume.calledOnce);
	t.false(stdin.pause.called);

	rerender(<Test renderFirstInput/>);

	t.true(stdin.setRawMode.calledOnce);
	t.true(stdin.resume.calledOnce);
	t.false(stdin.pause.called);

	rerender(<Test/>);

	t.true(stdin.setRawMode.calledTwice);
	t.deepEqual(stdin.setRawMode.lastCall.args, [false]);
	t.true(stdin.resume.calledOnce);
	t.true(stdin.pause.calledOnce);
});

test('setRawMode() should throw if raw mode is not supported', t => {
	const stdout = {
		write: spy(),
		columns: 100
	};

	const stdin = new EventEmitter();
	stdin.setEncoding = () => {};
	stdin.setRawMode = spy();
	stdin.isTTY = false;
	stdin.resume = spy();
	stdin.pause = spy();

	const didCatchInMount = spy();
	const didCatchInUnmount = spy();

	const options = {
		stdout,
		stdin,
		debug: true,
		experimental: isExperimental
	};

	class Input extends React.Component {
		render() {
			return <Box>Test</Box>;
		}

		componentDidMount() {
			try {
				this.props.setRawMode(true);
			} catch (error) {
				didCatchInMount(error);
			}
		}

		componentWillUnmount() {
			try {
				this.props.setRawMode(false);
			} catch (error) {
				didCatchInUnmount(error);
			}
		}
	}

	const Test = () => (
		<StdinContext.Consumer>
			{({setRawMode}) => (
				<Input setRawMode={setRawMode}/>
			)}
		</StdinContext.Consumer>
	);

	const {unmount} = render(<Test/>, options);
	unmount();

	t.is(didCatchInMount.callCount, 1);
	t.is(didCatchInUnmount.callCount, 1);
	t.false(stdin.setRawMode.called);
	t.false(stdin.resume.called);
	t.false(stdin.pause.called);
});

test('render different component based on whether stdin is a TTY or not', t => {
	const stdout = {
		write: spy(),
		columns: 100
	};

	const stdin = new EventEmitter();
	stdin.setEncoding = () => {};
	stdin.setRawMode = spy();
	stdin.isTTY = false;
	stdin.resume = spy();
	stdin.pause = spy();

	const options = {
		stdout,
		stdin,
		debug: true,
		experimental: isExperimental
	};

	class Input extends React.Component {
		render() {
			return <Box>Test</Box>;
		}

		componentDidMount() {
			this.props.setRawMode(true);
		}

		componentWillUnmount() {
			this.props.setRawMode(false);
		}
	}

	const Test = ({renderFirstInput, renderSecondInput}) => (
		<StdinContext.Consumer>
			{({isRawModeSupported, setRawMode}) => (
				<>
					{isRawModeSupported && renderFirstInput && <Input setRawMode={setRawMode}/>}
					{isRawModeSupported && renderSecondInput && <Input setRawMode={setRawMode}/>}
				</>
			)}
		</StdinContext.Consumer>
	);

	const {rerender} = render(<Test renderFirstInput renderSecondInput/>, options);

	t.false(stdin.setRawMode.called);
	t.false(stdin.resume.called);
	t.false(stdin.pause.called);

	rerender(<Test renderFirstInput/>);

	t.false(stdin.setRawMode.called);
	t.false(stdin.resume.called);
	t.false(stdin.pause.called);

	rerender(<Test/>);

	t.false(stdin.setRawMode.called);
	t.false(stdin.resume.called);
	t.false(stdin.pause.called);
});

test('render only last frame when run in CI', async t => {
	const output = await run('ci', {
		env: {CI: true}
	});

	t.is(stripAnsi(output), [
		'#1',
		'#2',
		'#3',
		'#4',
		'#5',
		'Counter: 5'
	].join('\r\n') + '\r\n');
});
