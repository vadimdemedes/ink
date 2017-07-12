import EventEmitter from 'events';
import stripAnsi from 'strip-ansi';
import {spy} from 'sinon';
import test from 'ava';
import {h, render, Component} from '..';
import {rerender} from '../lib/render-queue';

const stripOutput = str => stripAnsi(str).trim();

const createStdin = () => {
	const events = new EventEmitter();
	events.setRawMode = spy();

	return events;
};

const createStdout = () => ({
	write: spy()
});

test('set up stdin to emit keypress events', t => {
	const Test = () => 'Test';

	const stdin = createStdin();
	const stdout = createStdout();
	const unmount = render(<Test/>, {stdin, stdout});

	t.true(stdin.setRawMode.calledOnce);
	t.deepEqual(stdin.setRawMode.firstCall.args, [true]);
	t.deepEqual(stdin.eventNames(), ['newListener']);

	unmount();

	t.true(stdin.setRawMode.calledTwice);
	t.deepEqual(stdin.setRawMode.secondCall.args, [false]);
});

test('update output', t => {
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

test('unmount', t => {
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

test('ignore updates when unmounted', t => {
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
