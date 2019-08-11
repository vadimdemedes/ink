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
		const onTimeout = () => {
			if (this.state.counter > 4) {
				return;
			}

			this.setState(prevState => ({
				counter: prevState.counter + 1
			}));

			this.timer = setTimeout(onTimeout, 100);
		};

		this.timer = setTimeout(onTimeout, 100);
	}

	componentWillUnmount() {
		clearTimeout(this.timer);
	}
}

render(<Test/>, {
	experimental: process.env.EXPERIMENTAL === 'true'
});
