'use strict';
const React = require('react');
const {render, Color} = require('../..');

class Counter extends React.Component {
	constructor() {
		super();

		this.state = {
			counter: 0
		};
	}

	render() {
		return (
			<Color green>
				{this.state.counter} tests passed
			</Color>
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

render(<Counter/>);
