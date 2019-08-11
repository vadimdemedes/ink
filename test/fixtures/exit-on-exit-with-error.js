/* eslint-disable react/prop-types */
'use strict';
const React = require('react');
const {render, Box, AppContext} = require('../..');

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
		setTimeout(() => this.props.onExit(new Error('errored')), 500);

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

const app = render((
	<AppContext.Consumer>
		{({exit}) => (
			<Test onExit={exit}/>
		)}
	</AppContext.Consumer>
), {
	experimental: process.env.EXPERIMENTAL === 'true'
});

app.waitUntilExit().catch(error => console.log(error.message));
