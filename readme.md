<h1 align="center">
	<br>
	<img width="192" alt="Ink" src="media/logo.png">
	<br>
	<br>
	<br>
</h1>

> React for CLIs. Build and test your CLI output using components.

[![Build Status](https://travis-ci.org/vadimdemedes/ink.svg?branch=master)](https://travis-ci.org/vadimdemedes/ink)


## Install

```
$ npm install ink
```


## Usage

```jsx
const {h, render, Component, Text} = require('ink');

class Counter extends Component {
	constructor() {
		super();

		this.state = {
			i: 0
		};
	}

	render() {
		return (
			<Text green>
				{this.state.i} tests passed
			</Text>
		);
	}

	componentDidMount() {
		this.timer = setInterval(() => {
			this.setState({
				i: this.state.i + 1
			});
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

render(<Counter/>);
```

<img src="media/demo.gif" width="428" height="232">


## Useful Components

- [ink-redux](https://github.com/vadimdemedes/ink-redux) - Redux bindings.
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input) - Text input.
- [ink-password-input](https://github.com/vadimdemedes/ink-password-input) - Password input.
- [ink-progress-bar](https://github.com/brigand/ink-progress-bar) - Configurable component for rendering progress bars.
- [ink-spinner](https://github.com/vadimdemedes/ink-spinner) - Spinner.
- [ink-console](https://github.com/ForbesLindesay/ink-console) - Render output from `console[method]` calls in a scrollable panel.
- [ink-image](https://github.com/kevva/ink-image) - Display images inside the terminal.
- [ink-checkbox-list](https://github.com/MaxMEllon/ink-checkbox-list) - Checkbox.


## Guide

- [Getting Started](#getting-started)
- [Core API](#core-api)
- [Components](#components)
- [Props](#props)
- [Lifecycle Methods](#lifecycle-methods)
- [State](#state)
- [Refs](#refs)
- [Context](#context)
- [Stateless Function Components](#stateless-function-components)
- [Built-in Components](#built-in-components)

Ink's goal is to provide the same component-based UI building experience that React provides, but for command-line apps. That's why it tries to implement the minimum required functionality of React. If you are already familiar with React (or Preact, since Ink borrows a few ideas from it), you already know Ink.

The key difference you have to remember is that the rendering result isn't a DOM, but a string, which Ink writes to the output.

### Getting Started

To ensure all examples work and you can begin your adventure with Ink, make sure to set up a JSX transpiler and set JSX pragma to `h`. You can use [`babel-plugin-transform-react-jsx`](https://babeljs.io/docs/plugins/transform-react-jsx/) to do this. For example, in `package.json`:

```json
{
	"babel": {
		"plugins": [
			[
				"transform-react-jsx",
				{
				  "pragma": "h"
				}
			]
		]
	}
}
```

Don't forget to import `h` into every file that contains JSX:

```jsx
const {h} = require('ink');

const Demo = () => <div/>;
```

### Core API

#### render(tree, stream)

Mount a component, listen for updates and update the output.
This method is used for interactive UIs, where you need state, user input or lifecycle methods.

It automatically enables `keypress` events on `process.stdin`. Since it requires [raw mode](https://davidwalsh.name/node-raw-mode) to be enabled, Ink handles default behavior for you, like exiting with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

##### tree

Type: `VNode`

##### stream

Type: `Stream`<br>
Default: `process.stdout`

```jsx
const {h, render, Component} = require('ink');

class Counter extends Component {
	constructor() {
		super();

		this.state = {
			i: 0
		};
	}

	render(props, state) {
		return `Iteration #${state.i}`;
	}

	componentDidMount() {
		this.timer = setInterval(() => {
			this.setState({
				i: this.state.i + 1
			});
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

const unmount = render(<Counter/>);

setTimeout(() => {
	// Enough counting
	unmount();
}, 1000);
```

#### renderToString(tree, [prevTree])

Render a component to a string and return it.
Useful if you don't intend to use state or lifecycle methods and just want to render the UI once and exit.

```jsx
const {h, renderToString} = require('ink');

const Hello = () => 'Hello World';

process.stdout.write(renderToString(<Hello/>));
```

### Components

Similarly to React, there are two kinds of components: Stateful components (next, "component") and stateless function components. You can create a component by extending `Component` class. Unlike stateless function components, they have access to state, context, lifecycle methods and they can be accessed via refs.

```js
class Demo extends Component {
	render(props, state, context) {
		// props === this.props
		// state === this.state
		// context === this.context

		return 'Hello World';
	}
}
```

If you need to extend the constructor to set the initial state or for other purposes, make sure to call `super()` with `props` and `context`:

```js
constructor(props, context) {
	super(props, context);

	this.state = {
		i: 0
	};

	// Other initialization
}
```

#### Props

Props are basically arguments for components.
Every parent component can pass props to their children.

```jsx
class Child extends Component {
	render(props) {
		// props === this.props

		return `Hello, ${props.name}`;
	}
}

class Parent extends Component {
	render() {
		return <Child name="Joe"/>;
	}
}
```

To set default props on specific component, use `defaultProps`:

```js
const Test = ({first, second}) => `${first} ${second}`;

Test.defaultProps = {
	first: 'Hello',
	second: 'World'
};

// <Test/> => "Hello World"
```

##### Prop Types

Ink supports prop types out-of-the-box. All you have to do is set them in the same way you would in React:

```js
const PropTypes = require('prop-types');

Test.propTypes = {
	first: PropTypes.string.isRequired,
	second: PropTypes.string
};
```

**Note**: Prop types are only checked when `NODE_ENV` isn't `'production'`.

#### Lifecycle Methods

Lifecycle methods are component methods that are called whenever a certain event happens related to that specific component. All lifecycle methods are called from top to down, meaning that components on top receive those events earlier than their children.

##### componentWillMount()

Component is initialized and is about to be rendered and written to the output.

##### componentDidMount()

Component is rendered and written to the output.

##### componentWillUnmount()

Component is about to be unmounted and component instance is going to be destroyed.
This is the place to clean up timers, cancel HTTP requests, etc.

##### componentWillReceiveProps(nextProps, nextState)

Component is going to receive new props or state.
At this point `this.props` and `this.state` contain previous props and state.

##### shouldComponentUpdate(nextProps, nextState)

Determines whether to rerender component for the next props and state.
Return `false` to skip rerendering of component's children.
By default, returns `true`, so component is always rerendered on update.

##### componentWillUpdate(nextProps, nextState)

Component is about to rerender.

##### componentDidUpdate()

Component was rerendered and was written to the output.

#### State

Each component can have its local state accessible via `this.state`.
Whenever a state updates, the component is rerendered.

To set the initial state, extend the constructor and assign an object to `this.state`.
The state is accessible via `this.state` anywhere in the component, and it's also passed to `render()` as a second argument.

```js
class Demo extends Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			i: 0
		}
	}

	render(props, state) {
		return `Iteration ${state.i}`;
	}
}
```

##### setState(nextState)

###### nextState

Type: `Object` `Function`
Default: `{}`

Set a new state and update the output.

**Note**: `setState()` works by **extending** the state via `Object.assign()`, not replacing it with a new object. Therefore you can pass only changed values.

```js
class Demo extends Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			i: 0
		}
	}

	render(props, state) {
		return `Iteration ${state.i}`;
	}

	componentDidMount() {
		this.setState({
			i: this.state.i + 1
		});
	}
}
```

The above example will increment the `i` state property and render `Iteration 1` as a result.

`setState()` also accepts a function, which receives the current state as an argument.
The same effect of incrementing `i` could be achieved in a following way:

```js
this.setState(state => {
	return {
		i: state.i + 1
	}
});
```

This is useful when `setState()` calls are batched to ensure that you update the state in a stable way.

#### Refs

Refs can be used to get a direct reference to a component instance.
This is useful, if you want to access its methods, for example.

Refs work by setting a special `ref` prop on a component.
Prop's value must be a function, which receives a reference to a component as an argument or `null` when the wanted component is unmounted.

**Note**: You can't get refs to stateless function components.

```jsx
class Child extends Component {
	render() {
		return null;
	}

	hello() {
		return 'Hello World';
	}
}

class Parent extends Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			message: 'Ink is awesome'
		};
	}

	render(props, state) {
		const setChildRef = ref => {
			this.childRef = ref;
		};

		return (
			<div>
				{message}

				<Child ref={setChildRef}/>
			</div>
		)
	}

	componentDidMount() {
		this.setState({
			message: this.childRef.hello()
		});
	}
}
```

#### Context

Context is like a global state for all components.
Every component can access context either via `this.context` or inside `render()`:

```js
render(props, state, context) {
	// context === this.context
}
```

To add new entries to context, add `getChildContext()` method to your component:

```js
class Child extends Component {
	render() {
		return this.context.message;
	}
}

class Parent extends Component {
	getChildContext() {
		return {
			message: 'Hello World'
		};
	}

	render() {
		return <Child/>;
	}
}
```

#### Stateless Function Components

If you don't need state, lifecycle methods, context and refs, it's best to use stateless function components for their small amount of code and readability.

Using stateful components:

```js
class Demo extends Component {
	render(props, state, context) {
		return 'Hello World';
	}
}
```

Using stateless function components:

```js
const Demo = (props, context) => 'Hello World';
```

As you may have noticed, stateless function components still get access to props and context.

#### Built-in Components

Surprise, surprise, our favorite `<div>` and `<span>` can be used in Ink components!
They are useful for grouping elements, since JSX doesn't allow multiple elements without a parent.
The only difference between `<div>` and `<span>` is that `<div>` inserts a newline after children.

This won't work:

```jsx
const Demo = (
	<A/>
	<B/>
	<C/>
);
```

This will:

```jsx
const Demo = (
	<div>
		<A/>
		<B/>
		<C/>
	</div>
);
```

There's also `<br/>`, which serves the same purpose as on the web - a newline.

```jsx
const Demo = (
	<div>
		Line 1
		<br/>
		Line 2
	</div>
);
```

## License

MIT © [Vadim Demedes](https://github.com/vadimdemedes)
