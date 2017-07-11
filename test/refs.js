import {spy} from 'sinon';
import test from 'ava';
import {h, build, Component} from '..';

test('receive ref when component mounts', t => {
	class A extends Component {
		render() {
			return 'A';
		}

		hello() {
			return 'world';
		}
	}

	spy(A.prototype, 'componentDidMount');

	let ref;
	const onRef = spy(_ref => {
		ref = _ref;
	});

	build(<A ref={onRef}/>);

	t.true(onRef.calledOnce);
	t.true(A.prototype.componentDidMount.calledOnce);
	t.true(onRef.calledAfter(A.prototype.componentDidMount));
	t.is(ref.hello(), 'world');
});

test('clear ref when component unmounts', t => {
	class A extends Component {
		render() {
			return 'A';
		}
	}

	class B extends Component {
		render() {
			return 'B';
		}
	}

	spy(A.prototype, 'componentWillUnmount');

	const onRef = spy();

	const tree = build(<A ref={onRef}/>);
	t.true(onRef.calledOnce);

	build(<B/>, tree);
	t.true(onRef.calledTwice);
	t.is(onRef.secondCall.args[0], null);
});

test('disabled on functional components', t => {
	const A = () => 'A';
	const B = () => 'B';

	const onRef = spy();

	const tree = build(<A ref={onRef}/>);
	build(<B/>, tree);

	t.false(onRef.called);
});
