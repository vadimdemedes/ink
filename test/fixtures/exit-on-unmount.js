'use strict';
const React = require('react');
const {render, Box} = require('../..');

class Test extends React.Component {
	constructor() {
		super();

		this.state = {
			counter: 0
		};
	}

	render() {
		return (
			<Box>Counter: {this.state.counter}</Box>
		);
	}

	componentDidMount() {
		this.timer = setInterval(() => {
			this.setState(prevState => ({
				counter: prevState.counter + 1
			}));
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

const app = render(<Test/>, {
	experimental: process.env.EXPERIMENTAL === 'true'
});

setTimeout(() => app.unmount(), 500);
app.waitUntilExit().then(() => console.log('exited'));
