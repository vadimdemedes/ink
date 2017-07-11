import test from 'ava';
import {h, renderToString, Component} from '..';

test('empty context', t => {
	class Outer extends Component {
		render() {
			return <Inner/>;
		}
	}

	class Inner extends Component {
		render() {
			return JSON.stringify(this.context);
		}
	}

	t.is(renderToString(<Outer/>), '{}');
});

test('assigned context', t => {
	class Outer extends Component {
		render() {
			return <Inner/>;
		}

		getChildContext() {
			return {
				name: 'Rachel'
			};
		}
	}

	class Inner extends Component {
		render() {
			return this.context.name;
		}
	}

	t.is(renderToString(<Outer/>), 'Rachel');
});

test('nested context assignments', t => {
	class Outer extends Component {
		render() {
			return <Inner/>;
		}

		getChildContext() {
			return {
				she: 'Rachel'
			};
		}
	}

	class Inner extends Component {
		render() {
			return <InnerMost/>;
		}

		getChildContext() {
			return {
				he: 'Ross'
			};
		}
	}

	class InnerMost extends Component {
		render() {
			return `${this.context.she} and ${this.context.he}`;
		}
	}

	t.is(renderToString(<Outer/>), 'Rachel and Ross');
});

test('receive context in render arguments', t => {
	class Outer extends Component {
		render() {
			return <Inner/>;
		}

		getChildContext() {
			return {
				name: 'Monica'
			};
		}
	}

	class Inner extends Component {
		render(props, state, context) {
			return context.name;
		}
	}

	t.is(renderToString(<Outer/>), 'Monica');
});

test('receive context in a component that assigned it', t => {
	class A extends Component {
		render() {
			return this.context.name;
		}

		getChildContext() {
			return {
				name: 'Chandler'
			};
		}
	}

	t.is(renderToString(<A/>), 'Chandler');
});

test('receive context in a functional component', t => {
	class Outer extends Component {
		render() {
			return <Inner/>;
		}

		getChildContext() {
			return {
				name: 'Phoebe'
			};
		}
	}

	const Inner = (props, context) => context.name;

	t.is(renderToString(<Outer/>), 'Phoebe');
});
