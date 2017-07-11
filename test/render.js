import stripAnsi from 'strip-ansi';
import {spy} from 'sinon';
import test from 'ava';
import {h, render, Component} from '..';
import {rerender} from '../lib/render-queue';

const stripOutput = str => stripAnsi(str).trim();

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

	const stream = {write: spy()};
	render(<Test ref={setRef}/>, stream);

	t.true(stream.write.calledOnce);
	t.is(stripOutput(stream.write.firstCall.args[0]), '0');

	component.setState({
		i: 1
	});

	rerender();

	t.true(stream.write.calledTwice);
	t.is(stripOutput(stream.write.secondCall.args[0]), '1');
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

	const stream = {write: spy()};
	const unmount = render(<Test/>, stream);

	t.true(stream.write.calledOnce);
	t.is(stripOutput(stream.write.firstCall.args[0]), '0');

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

	const stream = {write: spy()};
	const unmount = render(<Test/>, stream);

	t.true(stream.write.calledOnce);
	t.is(stripOutput(stream.write.firstCall.args[0]), '0');

	unmount();

	component.setState({
		i: 1
	});

	rerender();

	t.true(stream.write.calledOnce);
});
