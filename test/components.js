import {spy} from 'sinon';
import test from 'ava';
import {h, render, renderToString, Component, Group} from '..';
import {rerender} from '../lib/render-queue';

test('render text', t => {
	class A extends Component {
		render() {
			return 'Hello';
		}
	}

	t.is(renderToString(render(<A/>)), 'Hello');
});

test('receive props', t => {
	class A extends Component {
		render() {
			return this.props.message;
		}
	}

	t.is(renderToString(render(<A message="Hello"/>)), 'Hello');
});

test('receive props in render arguments', t => {
	class A extends Component {
		render(props) {
			return props.message;
		}
	}

	t.is(renderToString(render(<A message="Hello"/>)), 'Hello');
});

test('rerender on new props', t => {
	class Hi extends Component {
		render(props) {
			return `Hello, ${props.name}`;
		}
	}

	const initialTree = render(<Hi name="John"/>);
	t.is(renderToString(initialTree), 'Hello, John');

	const finalTree = render(<Hi name="Michael"/>, initialTree);
	t.is(renderToString(finalTree), 'Hello, Michael');
});

test('render nested component', t => {
	class B extends Component {
		render() {
			return 'Hello';
		}
	}

	class A extends Component {
		render() {
			return <B/>;
		}
	}

	t.is(renderToString(render(<A/>)), 'Hello');
});

test('rerender nested components', t => {
	class C extends Component {
		render() {
			return 'C';
		}
	}

	class B extends Component {
		render() {
			return 'B';
		}
	}

	class A extends Component {
		render(props) {
			const X = props.component === 'B' ? B : C;
			return <X/>;
		}
	}

	const initialTree = render(<A component="B"/>);
	t.is(renderToString(initialTree), 'B');

	const finalTree = render(<A component="C"/>, initialTree);
	t.is(renderToString(finalTree), 'C');
});

test('render children', t => {
	class World extends Component {
		render() {
			return ' World';
		}
	}

	class Hello extends Component {
		render() {
			return 'Hello';
		}
	}

	class HelloWorld extends Component {
		render(props) {
			return (
				<Group>
					{props.children}
				</Group>
			);
		}
	}

	const tree = render((
		<HelloWorld>
			<Hello/>
			<World/>
		</HelloWorld>
	));

	t.is(renderToString(tree), 'Hello World');
});

test('update children', t => {
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

	class C extends Component {
		render() {
			return 'C';
		}
	}

	const firstTree = render((
		<Group>
			<A/>
			<B/>
		</Group>
	));

	t.is(renderToString(firstTree), 'AB');

	const secondTree = render((
		<Group>
			<A/>
			<B/>
			<C/>
		</Group>
	), firstTree);

	t.is(renderToString(secondTree), 'ABC');

	const thirdTree = render((
		<Group>
			<A/>
		</Group>
	), secondTree);

	t.is(renderToString(thirdTree), 'A');
});

test('render component with missing children', t => {
	class A extends Component {
		render(props) {
			return props.children;
		}
	}

	t.is(renderToString(render(<A/>)), '');
});

test('render optional children', t => {
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

	class Root extends Component {
		render(props) {
			return (
				<Group>
					{props.a && <A/>}
					{props.b && <B/>}
				</Group>
			);
		}
	}

	const firstTree = render(<Root a b/>);
	t.is(renderToString(firstTree), 'AB');

	const secondTree = render(<Root a/>, firstTree);
	t.is(renderToString(secondTree), 'A');

	const thirdTree = render(<Root/>, secondTree);
	t.is(renderToString(thirdTree), '');
});

test('render different root components', t => {
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

	// Component -> Component
	t.is(renderToString(render(<A/>, render(<B/>))), 'A');

	// String -> Component
	t.is(renderToString(render(<A/>, render('text'))), 'A');

	// Number -> Component
	t.is(renderToString(render(<A/>, render(10))), 'A');

	// Boolean -> Component
	t.is(renderToString(render(<A/>, render(false))), 'A');

	// Component -> String
	t.is(renderToString(render('text', render(<A/>))), 'text');

	// Component -> Number
	t.is(renderToString(render(10, render(<A/>))), '10');

	// Component -> Boolean
	t.is(renderToString(render(false, render(<A/>))), '');

	// String -> Number
	t.is(renderToString(render(10, render('text'))), '10');

	// String -> Boolean
	t.is(renderToString(render(false, render('text'))), '');

	// Number -> String
	t.is(renderToString(render('text', render(10))), 'text');

	// Number -> Boolean
	t.is(renderToString(render(false, render('text'))), '');
});

test('render with initial state', t => {
	class A extends Component {
		constructor() {
			super();

			this.state = {
				message: 'Hello'
			};
		}

		render() {
			return this.state.message;
		}
	}

	t.is(renderToString(render(<A/>)), 'Hello');
});

test('receive state in render arguments', t => {
	class A extends Component {
		constructor(props) {
			super(props);

			this.state = {
				message: 'Hello'
			};
		}

		render(props, state) {
			return `${state.message} to ${props.name}`;
		}
	}

	t.is(renderToString(render(<A name="Joe"/>)), 'Hello to Joe');
});

test('rerender when state updates', t => {
	let component;

	class A extends Component {
		constructor() {
			super();

			this.state = {
				message: 'Hello'
			};

			component = this;
		}

		render(props, state) {
			return state.message;
		}
	}

	const onUpdate = spy();
	const firstTree = render(<A/>, null, onUpdate);
	t.is(renderToString(firstTree), 'Hello');

	component.setState({message: 'Goodbye'});
	rerender();
	t.true(onUpdate.calledOnce);

	const secondTree = render(<A/>, firstTree);
	t.is(renderToString(secondTree), 'Goodbye');
});

test('store next state and set it only on rerender', t => {
	let component;

	class A extends Component {
		constructor(props) {
			super(props);

			this.state = {
				message: 'Hello'
			};

			component = this;
		}

		render(props, state) {
			return state.message;
		}
	}

	const firstTree = render(<A/>, null);
	t.is(renderToString(firstTree), 'Hello');

	component.setState({message: 'Goodbye'});
	t.is(renderToString(firstTree), 'Hello');

	const secondTree = render(<A/>, firstTree);
	t.is(renderToString(secondTree), 'Goodbye');
});

test('state callbacks', t => {
	let component;

	class A extends Component {
		constructor(props) {
			super(props);

			this.state = {
				message: 'Hello'
			};

			component = this;
		}

		render(props, state) {
			return state.message;
		}
	}

	spy(A.prototype, 'componentDidUpdate');

	const firstTree = render(<A/>);
	t.is(renderToString(firstTree), 'Hello');

	const callback = spy(() => {
		component.setState({
			message: 'Ciao'
		});
	});

	component.setState({
		message: 'Bonjour'
	}, callback);

	const secondTree = render(<A/>, firstTree);
	t.is(renderToString(secondTree), 'Bonjour');
	t.true(callback.calledOnce);
	t.true(callback.calledAfter(A.prototype.componentDidUpdate));

	const thirdTree = render(<A/>, secondTree);
	t.is(renderToString(thirdTree), 'Ciao');
	t.true(callback.calledOnce);
});

test('force render', t => {
	let component;
	let renders = 0;

	class A extends Component {
		constructor() {
			super();

			component = this;
		}

		render() {
			renders++;

			return 'A';
		}
	}

	let tree; // eslint-disable-line prefer-const
	const onUpdate = spy(() => {
		render(<A/>, tree, onUpdate);
	});

	tree = render(<A/>, null, onUpdate);
	t.is(renders, 1);

	component.forceUpdate();
	t.is(renders, 1);

	rerender();
	t.true(onUpdate.calledOnce);
	t.is(renders, 2);
});

test('dont render falsey values', t => {
	class A extends Component {
		render() {
			return (
				<Group>
					{null},{undefined},{false},{0},{NaN}
				</Group>
			);
		}
	}

	t.is(renderToString(render(<A/>)), ',,,0,NaN');
});

test('dont render null', t => {
	t.is(renderToString(render(null)), '');
});

test('dont render undefined', t => {
	t.is(renderToString(render(undefined)), '');
});

test('dont render boolean', t => {
	t.is(renderToString(render(false)), '');
	t.is(renderToString(render(true)), '');
});

test('render NaN as text', t => {
	t.is(renderToString(render(NaN)), 'NaN');
});

test('render numbers as text', t => {
	t.is(renderToString(render(0)), '0');
	t.is(renderToString(render(1)), '1');
});

test('render string', t => {
	t.is(renderToString(render('A')), 'A');
});

test('render functional component', t => {
	const A = () => 'A';

	t.is(renderToString(render(<A/>)), 'A');
});

test('render nested functional components', t => {
	const A = () => 'A';
	const B = () => <A/>;
	const C = () => <B/>;

	t.is(renderToString(render(<C/>)), 'A');
});

test('receive props in functional component', t => {
	const Hi = ({name}) => {
		return `Hi, ${name}`;
	};

	t.is(renderToString(render(<Hi name="John"/>)), 'Hi, John');
});
