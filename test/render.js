import EventEmitter from 'events';
import stripAnsi from 'strip-ansi';
import {spy, stub} from 'sinon';
import test from 'ava';
import {h, render, Component} from '..';
import {rerender} from '../lib/render-queue';

const stripOutput = str => stripAnsi(str).trim();

const createStdin = () => {
	const stdin = new EventEmitter();
	stdin.setRawMode = spy();
	stdin.pause = spy();
	stdin.isTTY = spy();

	return stdin;
};

const createStdout = () => {
	const stdout = new EventEmitter();
	stdout.write = spy();

	return stdout;
};

test.serial('set up stdin to emit keypress events', t => {
	const Test = () => 'Test';

	const stdin = createStdin();
	const stdout = createStdout();
	const unmount = render(<Test/>, {stdin, stdout});

	t.true(stdin.setRawMode.calledOnce);
	t.deepEqual(stdin.setRawMode.firstCall.args, [true]);
	t.deepEqual(stdin.eventNames().sort(), ['data', 'keypress'].sort());

	unmount();

	t.true(stdin.pause.calledOnce);
	t.true(stdin.setRawMode.calledTwice);
	t.deepEqual(stdin.setRawMode.secondCall.args, [false]);
});

test.serial('exit on esc', t => {
	const Test = () => 'Test';

	const stdin = createStdin();
	const stdout = createStdout();
	render(<Test/>, {stdin, stdout});

	stdin.emit('keypress', '', {
		name: 'escape'
	});

	t.true(stdin.setRawMode.calledTwice);
	t.deepEqual(stdin.setRawMode.secondCall.args, [false]);
});

test.serial('exit on ctrl+c', t => {
	const Test = () => 'Test';

	const stdin = createStdin();
	const stdout = createStdout();
	render(<Test/>, {stdin, stdout});

	stdin.emit('keypress', 'c', {
		name: 'c',
		ctrl: true
	});

	t.true(stdin.setRawMode.calledTwice);
	t.deepEqual(stdin.setRawMode.secondCall.args, [false]);
});

test.serial('update output', t => {
	class Test extends Component {
		constructor(props) {
			super(props);

			this.state = {
				i: 0
			};
		}

		render(props, state) {
			return String(state.i);
		}
	}

	let component;

	const setRef = ref => {
		component = ref;
	};

	const stdin = createStdin();
	const stdout = createStdout();
	render(<Test ref={setRef}/>, {stdin, stdout});

	t.true(stdout.write.calledOnce);
	t.is(stripOutput(stdout.write.firstCall.args[0]), '0');

	component.setState({
		i: 1
	});

	rerender();

	t.true(stdout.write.calledTwice);
	t.is(stripOutput(stdout.write.secondCall.args[0]), '1');
});

test.serial('unmount', t => {
	class Test extends Component {
		constructor(props) {
			super(props);

			this.state = {
				i: 0
			};
		}

		render(props, state) {
			return String(state.i);
		}
	}

	spy(Test.prototype, 'componentWillUnmount');

	const stdin = createStdin();
	const stdout = createStdout();
	const unmount = render(<Test/>, {stdin, stdout});

	t.true(stdout.write.calledOnce);
	t.is(stripOutput(stdout.write.firstCall.args[0]), '0');

	unmount();

	t.true(Test.prototype.componentWillUnmount.calledOnce);
});

test.serial('ignore updates when unmounted', t => {
	let component;

	class Test extends Component {
		constructor(props) {
			super(props);

			this.state = {
				i: 0
			};

			component = this;
		}

		render(props, state) {
			return String(state.i);
		}
	}

	const stdin = createStdin();
	const stdout = createStdout();
	const unmount = render(<Test/>, {stdin, stdout});

	t.true(stdout.write.calledOnce);
	t.is(stripOutput(stdout.write.firstCall.args[0]), '0');

	unmount();

	component.setState({
		i: 1
	});

	rerender();

	t.true(stdout.write.calledOnce);
});

['dir', 'log', 'info', 'warn', 'error'].forEach(method => {
	test.serial(`handle console.${method}() and move output below`, t => {
		stub(console, method);

		const Test = () => 'Test';

		const stdin = createStdin();
		const stdout = createStdout();
		const unmount = render(<Test/>, {stdin, stdout});

		t.true(stdout.write.calledOnce);
		t.is(stripOutput(stdout.write.getCall(0).args[0]), 'Test');

		console[method]('Console');
		unmount();

		t.true(stdout.write.calledThrice);
		t.is(stripOutput(stdout.write.getCall(1).args[0]), '');
		t.is(stripOutput(stdout.write.getCall(2).args[0]), 'Test');

		t.true(console[method].calledOnce);
		t.is(console[method].getCall(0).args[0], 'Console');
		t.true(console[method].getCall(0).calledAfter(stdout.write.getCall(1)));
		t.true(console[method].getCall(0).calledBefore(stdout.write.getCall(2)));

		console[method].restore();
	});
});

test.serial('rerender on resize', t => {
	let i = 0;

	const Test = () => String(i++);

	const stdin = createStdin();
	const stdout = createStdout();

	const unmount = render(<Test/>, {stdin, stdout});

	t.is(stdout.listenerCount('resize'), 1);
	t.true(stdout.write.calledOnce);
	t.is(stripOutput(stdout.write.getCall(0).args[0]), '0');

	stdout.emit('resize');

	t.true(stdout.write.calledTwice);
	t.is(stripOutput(stdout.write.getCall(1).args[0]), '1');

	unmount();

	t.is(stdout.listenerCount('resize'), 0);
});
