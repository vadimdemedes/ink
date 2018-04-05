import PropTypes from 'prop-types';
import {spy, stub} from 'sinon';
import ansiStyles from 'ansi-styles';
import chalk from 'chalk';
import test from 'ava';
import {h, build, Indent, Color, Underline, Bold, Component} from '..';
import renderToString from '../lib/render-to-string';
import {rerender} from '../lib/render-queue';

test('render text', t => {
	class A extends Component {
		render() {
			return 'Hello';
		}
	}

	t.is(renderToString(build(<A/>)), 'Hello');
});

test('receive props', t => {
	class A extends Component {
		render() {
			return this.props.message;
		}
	}

	t.is(renderToString(build(<A message="Hello"/>)), 'Hello');
});

test('receive props in render arguments', t => {
	class A extends Component {
		render(props) {
			return props.message;
		}
	}

	t.is(renderToString(build(<A message="Hello"/>)), 'Hello');
});

test('receive props with default props', t => {
	class Test extends Component {
		render(props) {
			return `${props.a} ${props.b} ${props.c}`;
		}
	}

	Test.defaultProps = {
		a: 'a',
		b: 'b'
	};

	const tree = build(<Test b="z" c="c"/>);
	t.is(renderToString(tree), 'a z c');
	t.is(renderToString(build(<Test c="c"/>, tree)), 'a b c');
});

test('rerender on new props', t => {
	class Hi extends Component {
		render(props) {
			return `Hello, ${props.name}`;
		}
	}

	const initialTree = build(<Hi name="John"/>);
	t.is(renderToString(initialTree), 'Hello, John');

	const finalTree = build(<Hi name="Michael"/>, initialTree);
	t.is(renderToString(finalTree), 'Hello, Michael');
});

test.serial('check prop types', t => {
	stub(console, 'error');

	const Child = () => '';
	const Parent = () => '';

	Parent.defaultProps = {
		message: 'Test'
	};

	Parent.propTypes = {
		message: PropTypes.string,
		children: PropTypes.node
	};

	build((
		<Parent>
			<Child/>
		</Parent>
	));

	t.false(console.error.called);

	build(<Parent message={123}/>);

	t.true(console.error.calledOnce);
	t.is(console.error.firstCall.args[0], 'Warning: Failed prop type: Invalid prop `message` of type `number` supplied to `Parent`, expected `string`.');

	console.error.restore();
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

	t.is(renderToString(build(<A/>)), 'Hello');
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

	const initialTree = build(<A component="B"/>);
	t.is(renderToString(initialTree), 'B');

	const finalTree = build(<A component="C"/>, initialTree);
	t.is(renderToString(finalTree), 'C');
});

// Regression test for crash caused by <div> returning an array
// of children and a newline, e.g. [[A, B], '\n']
test('render deeply nested components', t => {
	const A = () => 'A';
	const B = () => 'B';
	const Test = () => (
		<div>
			<A/>
			<B/>
		</div>
	);

	t.is(renderToString(build(<Test/>)), 'AB\n');
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
				<span>
					{props.children}
				</span>
			);
		}
	}

	const tree = build((
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

	const firstTree = build((
		<span>
			<A/>
			<B/>
		</span>
	));

	t.is(renderToString(firstTree), 'AB');

	const secondTree = build((
		<span>
			<A/>
			<B/>
			<C/>
		</span>
	), firstTree);

	t.is(renderToString(secondTree), 'ABC');

	const thirdTree = build((
		<span>
			<A/>
		</span>
	), secondTree);

	t.is(renderToString(thirdTree), 'A');
});

test('render component with missing children', t => {
	class A extends Component {
		render(props) {
			return props.children;
		}
	}

	t.is(renderToString(build(<A/>)), '');
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
				<span>
					{props.a && <A/>}
					{props.b && <B/>}
				</span>
			);
		}
	}

	const firstTree = build(<Root a b/>);
	t.is(renderToString(firstTree), 'AB');

	const secondTree = build(<Root a/>, firstTree);
	t.is(renderToString(secondTree), 'A');

	const thirdTree = build(<Root/>, secondTree);
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
	t.is(renderToString(build(<A/>, build(<B/>))), 'A');

	// String -> Component
	t.is(renderToString(build(<A/>, build('text'))), 'A');

	// Number -> Component
	t.is(renderToString(build(<A/>, build(10))), 'A');

	// Boolean -> Component
	t.is(renderToString(build(<A/>, build(false))), 'A');

	// Component -> String
	t.is(renderToString(build('text', build(<A/>))), 'text');

	// Component -> Number
	t.is(renderToString(build(10, build(<A/>))), '10');

	// Component -> Boolean
	t.is(renderToString(build(false, build(<A/>))), '');

	// String -> Number
	t.is(renderToString(build(10, build('text'))), '10');

	// String -> Boolean
	t.is(renderToString(build(false, build('text'))), '');

	// Number -> String
	t.is(renderToString(build('text', build(10))), 'text');

	// Number -> Boolean
	t.is(renderToString(build(false, build('text'))), '');
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

	t.is(renderToString(build(<A/>)), 'Hello');
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

	t.is(renderToString(build(<A name="Joe"/>)), 'Hello to Joe');
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
	const firstTree = build(<A/>, null, onUpdate);
	t.is(renderToString(firstTree), 'Hello');

	component.setState({message: 'Goodbye'});
	rerender();
	t.true(onUpdate.calledOnce);

	const secondTree = build(<A/>, firstTree);
	t.is(renderToString(secondTree), 'Goodbye');
});

test('set state accepts a function', t => {
	let component;

	class A extends Component {
		constructor(props, context) {
			super(props, context);

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
	const firstTree = build(<A value="message"/>, null, onUpdate);
	t.is(renderToString(firstTree), 'Hello');

	component.setState((oldState, props) => {
		t.is(oldState.message, 'Hello');
		t.is(props.value, 'message');
		return {message: 'Goodbye'};
	});
	rerender();
	t.true(onUpdate.calledOnce);

	const secondTree = build(<A/>, firstTree);
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

	const firstTree = build(<A/>, null);
	t.is(renderToString(firstTree), 'Hello');

	component.setState({message: 'Goodbye'});
	t.is(renderToString(firstTree), 'Hello');

	const secondTree = build(<A/>, firstTree);
	t.is(renderToString(secondTree), 'Goodbye');
});

test('merge pending states', t => {
	let component;

	class A extends Component {
		constructor() {
			super();

			this.state = {
				first: 'Hello',
				second: 'Joe'
			};

			component = this;
		}

		render(props, state) {
			return `${state.first} ${state.second}`;
		}
	}

	const firstTree = build(<A/>, null);
	t.is(renderToString(firstTree), 'Hello Joe');

	const firstCallback = spy();
	const secondCallback = spy();

	component.setState({first: 'Bye'}, firstCallback);
	component.setState({second: 'Ross'}, secondCallback);

	const secondTree = build(<A/>, firstTree);
	t.is(renderToString(secondTree), 'Bye Ross');

	t.true(firstCallback.calledOnce);
	t.true(secondCallback.calledOnce);
	t.true(firstCallback.calledBefore(secondCallback));
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

	const firstTree = build(<A/>);
	t.is(renderToString(firstTree), 'Hello');

	const callback = spy(() => {
		component.setState({
			message: 'Ciao'
		});
	});

	component.setState({
		message: 'Bonjour'
	}, callback);

	const secondTree = build(<A/>, firstTree);
	t.is(renderToString(secondTree), 'Bonjour');
	t.true(callback.calledOnce);
	t.true(callback.calledAfter(A.prototype.componentDidUpdate));

	const thirdTree = build(<A/>, secondTree);
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
		build(<A/>, tree, onUpdate);
	});

	tree = build(<A/>, null, onUpdate);
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
				<span>
					{null},{undefined},{false},{0},{NaN}
				</span>
			);
		}
	}

	t.is(renderToString(build(<A/>)), ',,,0,NaN');
});

test('dont render null', t => {
	t.is(renderToString(build(null)), '');
});

test('dont render undefined', t => {
	t.is(renderToString(build(undefined)), '');
});

test('dont render boolean', t => {
	t.is(renderToString(build(false)), '');
	t.is(renderToString(build(true)), '');
});

test('render NaN as text', t => {
	t.is(renderToString(build(NaN)), 'NaN');
});

test('render numbers as text', t => {
	t.is(renderToString(build(0)), '0');
	t.is(renderToString(build(1)), '1');
});

test('render string', t => {
	t.is(renderToString(build('A')), 'A');
});

test('render functional component', t => {
	const A = () => 'A';

	t.is(renderToString(build(<A/>)), 'A');
});

test('render nested functional components', t => {
	const A = () => 'A';
	const B = () => <A/>;
	const C = () => <B/>;

	t.is(renderToString(build(<C/>)), 'A');
});

test('receive props in functional component', t => {
	const Hi = ({name}) => {
		return `Hi, ${name}`;
	};

	t.is(renderToString(build(<Hi name="John"/>)), 'Hi, John');
});

test('render br', t => {
	t.is(renderToString(build(<br/>)), '\n');
});

test('render span', t => {
	t.is(renderToString(build(<span>Test</span>)), 'Test');
});

test('render div', t => {
	t.is(renderToString(build(<div>Test</div>)), 'Test\n');
});

test('render styled text', t => {
	const styles = Object.keys(ansiStyles);

	for (const style of styles) {
		const props = {
			[style]: true
		};

		t.is(renderToString(build(<Color {...props}>Test</Color>)), chalk[style]('Test'));
	}

	t.is(renderToString(build(<Color rgb={[40, 42, 54]}>Test</Color>)), chalk.rgb(40, 42, 54)('Test'));
});

test('render bold text', t => {
	t.is(renderToString(build(<Bold>Test</Bold>)), chalk.bold('Test'));
});

test('render underlined text', t => {
	t.is(renderToString(build(<Underline>Test</Underline>)), chalk.underline('Test'));
});

test('indent text', t => {
	t.is(renderToString(build(<Indent size={2}>Test</Indent>)), '  Test');
	t.is(renderToString(build(<Indent size={2} indent="_">Test</Indent>)), '__Test');
});
