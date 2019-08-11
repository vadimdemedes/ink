/* eslint-disable react/jsx-fragments */
'use strict';
const React = require('react');
const {render, Static, Box} = require('../..');

class Test extends React.Component {
	constructor() {
		super();

		this.state = {
			items: [],
			counter: 0
		};
	}

	render() {
		return (
			<React.Fragment>
				<Static>
					{this.state.items.map(item => (
						<Box key={item}>{item}</Box>
					))}
				</Static>

				<Box>Counter: {this.state.counter}</Box>
			</React.Fragment>
		);
	}

	componentDidMount() {
		const onTimeout = () => {
			if (this.state.counter > 4) {
				return;
			}

			this.setState(prevState => ({
				counter: prevState.counter + 1,
				items: [
					...prevState.items,
					`#${prevState.counter + 1}`
				]
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
