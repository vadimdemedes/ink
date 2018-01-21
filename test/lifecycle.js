import {spy} from 'sinon';
import test from 'ava';
import {h, build, Component} from '..';
import renderToString from '../lib/render-to-string';

const methods = [
	'_constructor',
	'componentWillMount',
	'componentDidMount',
	'shouldComponentUpdate',
	'componentWillReceiveProps',
	'componentWillUpdate',
	'componentDidUpdate',
	'componentWillUnmount'
];

const spyOn = component => {
	const proto = component.prototype;

	methods.forEach(method => {
		if (proto[method]) {
			spy(proto, method);
		}
	});
};

const reset = component => {
	const proto = component.prototype;

	methods.forEach(method => {
		if (proto[method]) {
			proto[method].reset();
		}
	});
};

test('componentWillUpdate - dont call on initial render', t => {
	class A extends Component {
		componentWillUpdate() {}

		render() {
			return 'A';
		}
	}

	spyOn(A);
	build(<A/>);

	t.false(A.prototype.componentWillUpdate.called);
});

test('componentWillUpdate - call on rerender with new props from parent', t => {
	let outer;

	class Outer extends Component {
		constructor(props) {
			super(props);

			this.state = {
				i: 0
			};

			outer = this;
		}

		render() {
			return <Inner i={this.state.i}/>;
		}
	}

	class Inner extends Component {
		componentWillUpdate(nextProps, nextState) {
			t.deepEqual(nextProps, {
				children: [],
				i: 1
			});

			t.deepEqual(nextState, {});
		}

		render() {
			return 'Inner';
		}
	}

	spyOn(Inner);

	const tree = build(<Outer/>);
	t.false(Inner.prototype.componentWillUpdate.called);

	outer.setState({
		i: 1
	});

	build(<Outer/>, tree);
	t.true(Inner.prototype.componentWillUpdate.calledOnce);
});

test('componentWillUpdate - call on new state', t => {
	let component;

	class A extends Component {
		constructor(props) {
			super(props);

			this.state = {
				i: 0
			};

			component = this;
		}

		componentWillUpdate() {}

		render() {
			return 'A';
		}
	}

	spyOn(A);

	const tree = build(<A/>, null);
	t.false(A.prototype.componentWillUpdate.called);

	component.setState({
		i: 1
	});

	build(<A/>, tree);
	t.true(A.prototype.componentWillUpdate.calledOnce);
});

test('componentWillReceiveProps - dont call on initial render', t => {
	class A extends Component {
		componentWillReceiveProps() {}

		render() {
			return 'A';
		}
	}

	spyOn(A);
	build(<A/>);

	t.false(A.prototype.componentWillReceiveProps.called);
});

test('componentWillReceiveProps - call on rerender with new props from parent', t => {
	let outer;

	class Outer extends Component {
		constructor(props) {
			super(props);

			this.state = {
				i: 0
			};

			outer = this;
		}

		render() {
			return <Inner i={this.state.i}/>;
		}
	}

	class Inner extends Component {
		componentWillMount() {
			t.is(this.props.i, 0);
		}

		componentWillReceiveProps(nextProps) {
			t.deepEqual(nextProps, {
				children: [],
				i: 1
			});
		}

		render() {
			return 'Inner';
		}
	}

	spyOn(Inner);

	const tree = build(<Outer/>);
	t.true(Inner.prototype.componentWillMount.calledOnce);
	t.false(Inner.prototype.componentWillReceiveProps.called);

	outer.setState({
		i: 1
	});

	build(<Outer/>, tree);
	t.true(Inner.prototype.componentWillMount.calledOnce);
	t.true(Inner.prototype.componentWillReceiveProps.calledOnce);
});

test('componentWillReceiveProps - call in the right order', t => {
	let outer;

	class Outer extends Component {
		constructor(props) {
			super(props);

			this.state = {
				i: 0
			};

			outer = this;
		}

		render() {
			return <Inner i={this.state.i}/>;
		}
	}

	class Inner extends Component {
		componentWillReceiveProps() {}
		componentWillUpdate() {}
		componentDidUpdate() {}

		render() {
			return 'Inner';
		}
	}

	spyOn(Inner);

	const tree = build(<Outer/>);
	outer.setState({
		i: 1
	});

	build(<Outer/>, tree);

	t.true(Inner.prototype.componentWillReceiveProps.calledBefore(Inner.prototype.componentWillUpdate));
	t.true(Inner.prototype.componentWillUpdate.calledBefore(Inner.prototype.componentDidUpdate));
});

test('componentWillUnmount', t => {
	class A extends Component {
		componentDidMount() {}
		componentWillUnmount() {}
	}

	class B extends Component {
		componentDidMount() {}
		componentWillUnmount() {}
	}

	spyOn(A);
	spyOn(B);

	const firstTree = build(<A/>);
	t.true(A.prototype.componentDidMount.calledOnce);

	const secondTree = build(<B/>, firstTree);
	t.true(A.prototype.componentWillUnmount.calledOnce);
	t.true(B.prototype.componentDidMount.calledOnce);

	build(<A/>, secondTree);
	t.true(B.prototype.componentWillUnmount.calledOnce);
	t.true(A.prototype.componentDidMount.calledTwice);
});

let outer;

class LifecycleTestComponent extends Component {
	constructor(props) {
		super(props);

		this._constructor();
	}

	_constructor() {}
}

class Outer extends LifecycleTestComponent {
	constructor(props) {
		super(props);

		this.state = {
			showInner: true,
			i: 0
		};

		outer = this;
	}

	render() {
		const {showInner, i} = this.state;

		return showInner && <Inner i={i}/>;
	}
}

let shouldComponentUpdate = true;

class Inner extends LifecycleTestComponent {
	shouldComponentUpdate() {
		return shouldComponentUpdate;
	}

	render() {
		return (
			<span>
				<InnerMost i={this.props.i}/>
			</span>
		);
	}
}

class InnerMost extends LifecycleTestComponent {
	render() {
		return `InnerMost ${this.props.i}`;
	}
}

spyOn(Outer);
spyOn(Inner);
spyOn(InnerMost);

const resetAll = () => {
	reset(Outer);
	reset(Inner);
	reset(InnerMost);
};

test.serial('nested components - enabled updates - initial render', t => {
	resetAll();
	build(<Outer/>);

	t.true(Outer.prototype._constructor.calledOnce);
	t.true(Outer.prototype.componentWillMount.calledOnce);
	t.true(Outer.prototype.componentDidMount.calledOnce);
	t.true(Outer.prototype.componentDidMount.calledAfter(Outer.prototype.componentWillMount));

	t.true(Inner.prototype._constructor.calledOnce);
	t.true(Inner.prototype.componentWillMount.calledOnce);
	t.true(Inner.prototype.componentDidMount.calledOnce);
	t.true(Inner.prototype.componentDidMount.calledAfter(Inner.prototype.componentWillMount));
	t.true(Inner.prototype.componentWillMount.calledAfter(Outer.prototype.componentWillMount));
	t.true(Inner.prototype.componentDidMount.calledBefore(Outer.prototype.componentDidMount));

	t.true(InnerMost.prototype._constructor.calledOnce);
	t.true(InnerMost.prototype.componentWillMount.calledOnce);
	t.true(InnerMost.prototype.componentDidMount.calledOnce);
	t.true(InnerMost.prototype.componentDidMount.calledAfter(InnerMost.prototype.componentWillMount));
	t.true(InnerMost.prototype.componentWillMount.calledAfter(Inner.prototype.componentWillMount));
	t.true(InnerMost.prototype.componentDidMount.calledBefore(Inner.prototype.componentDidMount));
});

test.serial('nested components - enabled updates - unmount child', t => {
	resetAll();
	const tree = build(<Outer/>);
	outer.setState({showInner: false});
	build(<Outer/>, tree);

	t.true(Outer.prototype.componentWillUpdate.calledOnce);
	t.true(Outer.prototype.componentDidUpdate.calledOnce);

	t.true(Inner.prototype.componentWillUnmount.calledOnce);
	t.true(InnerMost.prototype.componentWillUnmount.calledOnce);
	t.true(Inner.prototype.componentWillUnmount.calledBefore(InnerMost.prototype.componentWillUnmount));
});

test.serial('nested components - enabled updates - mount child', t => {
	resetAll();
	let tree = build(<Outer/>);
	outer.setState({showInner: false});
	tree = build(<Outer/>, tree);
	outer.setState({showInner: true});
	build(<Outer/>, tree);

	t.true(Outer.prototype._constructor.calledOnce);
	t.true(Outer.prototype.componentWillUpdate.calledTwice);
	t.true(Outer.prototype.componentDidUpdate.calledTwice);

	t.true(Inner.prototype._constructor.calledTwice);
	t.true(Inner.prototype.componentWillMount.calledTwice);
	t.true(Inner.prototype.componentDidMount.calledTwice);
	t.true(Inner.prototype.componentWillMount.calledAfter(Outer.prototype.componentWillUpdate));
	t.true(Inner.prototype.componentDidMount.calledBefore(Outer.prototype.componentDidUpdate));

	t.true(InnerMost.prototype._constructor.calledTwice);
	t.true(InnerMost.prototype.componentWillMount.calledTwice);
	t.true(InnerMost.prototype.componentDidMount.calledTwice);
	t.true(InnerMost.prototype.componentWillMount.calledAfter(Inner.prototype.componentWillMount));
	t.true(InnerMost.prototype.componentDidMount.calledBefore(Inner.prototype.componentDidMount));
});

test.serial('nested components - enabled updates - update children', t => {
	resetAll();
	let tree = build(<Outer/>);
	t.is(renderToString(tree), 'InnerMost 0');

	outer.setState({i: 1});
	tree = build(<Outer/>, tree);
	t.is(renderToString(tree), 'InnerMost 1');

	t.true(Outer.prototype.componentWillUpdate.calledOnce);
	t.true(Outer.prototype.componentDidUpdate.calledOnce);

	t.true(Inner.prototype._constructor.calledOnce);
	t.true(Inner.prototype.shouldComponentUpdate.calledOnce);
	t.true(Inner.prototype.componentWillReceiveProps.calledOnce);
	t.true(Inner.prototype.componentWillReceiveProps.calledAfter(Inner.prototype.shouldComponentUpdate));
	t.true(Inner.prototype.componentWillUpdate.calledOnce);
	t.true(Inner.prototype.componentWillUpdate.calledAfter(Inner.prototype.componentWillReceiveProps));
	t.true(Inner.prototype.componentWillUpdate.calledAfter(Outer.prototype.componentWillUpdate));
	t.true(Inner.prototype.componentDidUpdate.calledOnce);
	t.true(Inner.prototype.componentDidUpdate.calledAfter(Inner.prototype.componentWillUpdate));

	// TODO: componentDidUpdate must be called before parent's componentDidUpdate
	// t.true(Inner.prototype.componentDidUpdate.calledBefore(Outer.prototype.componentDidUpdate));

	t.true(InnerMost.prototype._constructor.calledOnce);
	t.true(InnerMost.prototype.shouldComponentUpdate.calledOnce);
	t.true(InnerMost.prototype.componentWillReceiveProps.calledOnce);
	t.true(InnerMost.prototype.componentWillReceiveProps.calledAfter(InnerMost.prototype.shouldComponentUpdate));
	t.true(InnerMost.prototype.componentWillUpdate.calledOnce);
	t.true(InnerMost.prototype.componentWillUpdate.calledAfter(InnerMost.prototype.componentWillReceiveProps));
	t.true(InnerMost.prototype.componentDidUpdate.calledOnce);
	t.true(InnerMost.prototype.componentDidUpdate.calledAfter(InnerMost.prototype.componentWillUpdate));
});

test.serial('nested components - disabled updates - initial render', t => {
	shouldComponentUpdate = false;
	resetAll();
	build(<Outer/>);

	t.true(Outer.prototype._constructor.calledOnce);
	t.true(Outer.prototype.componentWillMount.calledOnce);
	t.true(Outer.prototype.componentDidMount.calledOnce);
	t.true(Outer.prototype.componentDidMount.calledAfter(Outer.prototype.componentWillMount));

	t.true(Inner.prototype._constructor.calledOnce);
	t.true(Inner.prototype.componentWillMount.calledOnce);
	t.true(Inner.prototype.componentDidMount.calledOnce);
	t.true(Inner.prototype.componentDidMount.calledAfter(Inner.prototype.componentWillMount));
	t.true(Inner.prototype.componentWillMount.calledAfter(Outer.prototype.componentWillMount));
	t.true(Inner.prototype.componentDidMount.calledBefore(Outer.prototype.componentDidMount));

	t.true(InnerMost.prototype._constructor.calledOnce);
	t.true(InnerMost.prototype.componentWillMount.calledOnce);
	t.true(InnerMost.prototype.componentDidMount.calledOnce);
	t.true(InnerMost.prototype.componentDidMount.calledAfter(InnerMost.prototype.componentWillMount));
	t.true(InnerMost.prototype.componentWillMount.calledAfter(Inner.prototype.componentWillMount));
	t.true(InnerMost.prototype.componentDidMount.calledBefore(Inner.prototype.componentDidMount));
});

test.serial('nested components - disabled updates - unmount child', t => {
	shouldComponentUpdate = false;
	resetAll();
	const tree = build(<Outer/>);
	outer.setState({showInner: false});
	build(<Outer/>, tree);

	t.true(Outer.prototype.componentWillUpdate.calledOnce);
	t.true(Outer.prototype.componentDidUpdate.calledOnce);

	t.true(Inner.prototype.componentWillUnmount.calledOnce);
	t.true(InnerMost.prototype.componentWillUnmount.calledOnce);
	t.true(Inner.prototype.componentWillUnmount.calledBefore(InnerMost.prototype.componentWillUnmount));
});

test.serial('nested components - disabled updates - mount child', t => {
	shouldComponentUpdate = false;
	resetAll();
	let tree = build(<Outer/>);
	outer.setState({showInner: false});
	tree = build(<Outer/>, tree);
	outer.setState({showInner: true});
	build(<Outer/>, tree);

	t.true(Outer.prototype._constructor.calledOnce);
	t.true(Outer.prototype.componentWillUpdate.calledTwice);
	t.true(Outer.prototype.componentDidUpdate.calledTwice);

	t.true(Inner.prototype._constructor.calledTwice);
	t.true(Inner.prototype.componentWillMount.calledTwice);
	t.true(Inner.prototype.componentDidMount.calledTwice);
	t.true(Inner.prototype.componentWillMount.calledAfter(Outer.prototype.componentWillUpdate));
	t.true(Inner.prototype.componentDidMount.calledBefore(Outer.prototype.componentDidUpdate));

	t.true(InnerMost.prototype._constructor.calledTwice);
	t.true(InnerMost.prototype.componentWillMount.calledTwice);
	t.true(InnerMost.prototype.componentDidMount.calledTwice);
	t.true(InnerMost.prototype.componentWillMount.calledAfter(Inner.prototype.componentWillMount));
	t.true(InnerMost.prototype.componentDidMount.calledBefore(Inner.prototype.componentDidMount));
});

test.serial('nested components - disabled updates - update children', t => {
	shouldComponentUpdate = false;
	resetAll();
	let tree = build(<Outer/>);
	t.is(renderToString(tree), 'InnerMost 0');

	outer.setState({i: 1});
	tree = build(<Outer/>, tree);
	t.is(renderToString(tree), 'InnerMost 0');

	t.true(Outer.prototype.componentWillUpdate.calledOnce);
	t.true(Outer.prototype.componentDidUpdate.calledOnce);

	t.true(Inner.prototype._constructor.calledOnce);
	t.true(Inner.prototype.shouldComponentUpdate.calledOnce);
	t.true(Inner.prototype.componentWillReceiveProps.called);
	t.true(Inner.prototype.componentWillReceiveProps.calledAfter(Inner.prototype.shouldComponentUpdate));
	t.false(Inner.prototype.componentWillUpdate.called);
	t.false(Inner.prototype.componentDidUpdate.called);

	t.true(InnerMost.prototype._constructor.calledOnce);
	t.true(InnerMost.prototype.shouldComponentUpdate.calledOnce);
	t.true(InnerMost.prototype.componentWillReceiveProps.called);

	// TODO: don't call update methods on a child when parent has disabled updates
	// t.false(InnerMost.prototype.componentWillUpdate.called);
	// t.false(InnerMost.prototype.componentDidUpdate.calledOnce);
});

test.serial('nested components - disabled updates - update stateful child', t => {
	let outer;
	let innerMost;

	class LifecycleTestComponent extends Component {
		constructor(props) {
			super(props);

			this._constructor();
		}

		_constructor() {}
	}

	class Outer extends LifecycleTestComponent {
		constructor(props) {
			super(props);

			this.state = {
				showInner: true,
				i: 0
			};

			outer = this;
		}

		render() {
			const {showInner, i} = this.state;

			return showInner && <Inner i={i}/>;
		}
	}

	class Inner extends LifecycleTestComponent {
		shouldComponentUpdate() {
			return false;
		}

		render() {
			return (
				<span>
					<InnerMost i={this.props.i}/>
				</span>
			);
		}
	}

	class InnerMost extends LifecycleTestComponent {
		constructor(props) {
			super(props);

			this.state = {
				k: 0
			};

			innerMost = this;
		}

		render() {
			return `InnerMost ${this.props.i} ${this.state.k}`;
		}
	}

	spyOn(Outer);
	spyOn(Inner);
	spyOn(InnerMost);

	let tree = build(<Outer/>);
	t.is(renderToString(tree), 'InnerMost 0 0');

	outer.setState({i: 1});
	tree = build(<Outer/>, tree);
	t.is(renderToString(tree), 'InnerMost 0 0');

	innerMost.setState({k: 1});
	tree = build(<Outer/>, tree);
	t.is(renderToString(tree), 'InnerMost 0 1');

	t.true(Outer.prototype.componentWillUpdate.calledTwice);
	t.true(Outer.prototype.componentDidUpdate.calledTwice);

	t.true(Inner.prototype._constructor.calledOnce);
	t.true(Inner.prototype.shouldComponentUpdate.calledTwice);
	t.true(Inner.prototype.componentWillReceiveProps.calledTwice);
	t.true(Inner.prototype.componentWillReceiveProps.calledAfter(Inner.prototype.shouldComponentUpdate));
	t.false(Inner.prototype.componentWillUpdate.called);
	t.false(Inner.prototype.componentDidUpdate.called);

	t.true(InnerMost.prototype._constructor.calledOnce);
	t.true(InnerMost.prototype.shouldComponentUpdate.calledTwice);
	t.true(InnerMost.prototype.componentWillReceiveProps.calledTwice);
	t.true(InnerMost.prototype.componentWillUpdate.calledTwice);
	t.true(InnerMost.prototype.componentDidUpdate.calledTwice);
});
